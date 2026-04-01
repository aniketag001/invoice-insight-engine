import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoiceId, fileBase64, fileName, fileType } = await req.json();

    if (!invoiceId || !fileBase64) {
      return new Response(JSON.stringify({ error: "Missing invoiceId or fileBase64" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get auth header for Supabase client
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update status to processing
    await supabase
      .from("invoices")
      .update({ status: "processing" })
      .eq("id", invoiceId);

    // Determine if image or PDF
    const isImage = fileType?.startsWith("image/");
    const mimeType = fileType || "application/pdf";

    // Build messages for AI
    const systemPrompt = `You are an expert invoice data extraction system. Extract ALL structured data from the invoice.

Return a JSON object with exactly these fields:
{
  "vendor_name": "string - the company/vendor name",
  "invoice_number": "string - invoice/bill number",
  "invoice_date": "YYYY-MM-DD format or null",
  "due_date": "YYYY-MM-DD format or null",
  "subtotal": number or null,
  "tax_amount": number or null,
  "total_amount": number or null,
  "currency": "3-letter currency code, default USD",
  "line_items": [
    {
      "description": "string",
      "quantity": number or null,
      "unit_price": number or null,
      "amount": number or null
    }
  ],
  "confidence_score": number between 0 and 1 indicating extraction confidence,
  "format_signature": "string - brief description of invoice layout/template for format detection"
}

Be thorough. If a field is not found, use null. For amounts, extract numeric values only.
Handle noisy OCR gracefully - infer reasonable values when text is slightly garbled.`;

    const userContent: Array<Record<string, unknown>> = [];

    if (isImage) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${fileBase64}`,
        },
      });
      userContent.push({
        type: "text",
        text: "Extract all invoice data from this image. Return only valid JSON.",
      });
    } else {
      // For PDFs, we send as base64 data
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${fileBase64}`,
        },
      });
      userContent.push({
        type: "text",
        text: "Extract all invoice data from this document. Return only valid JSON.",
      });
    }

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        await supabase.from("invoices").update({ status: "failed" }).eq("id", invoiceId);
        return new Response(JSON.stringify({ error: "Rate limited. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        await supabase.from("invoices").update({ status: "failed" }).eq("id", invoiceId);
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`AI gateway returned ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || "{}";

    // Parse the extracted data
    let extracted: Record<string, unknown>;
    try {
      // Clean markdown code blocks if present
      let cleaned = rawContent.trim();
      if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
      if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
      if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
      extracted = JSON.parse(cleaned.trim());
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      await supabase.from("invoices").update({ status: "failed", raw_text: rawContent }).eq("id", invoiceId);
      return new Response(JSON.stringify({ error: "Failed to parse extraction result" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate format hash for template detection
    const formatSignature = (extracted.format_signature as string) || "";
    const formatHash = await generateHash(formatSignature);

    // Normalize vendor name
    const vendorName = (extracted.vendor_name as string) || null;
    const normalizedVendor = vendorName ? normalizeVendorName(vendorName) : null;

    // Check for duplicate invoices
    let isDuplicate = false;
    let duplicateOf = null;
    if (extracted.invoice_number && vendorName) {
      const { data: existingInvoices } = await supabase
        .from("invoices")
        .select("id")
        .eq("invoice_number", extracted.invoice_number as string)
        .eq("normalized_vendor_name", normalizedVendor)
        .neq("id", invoiceId)
        .limit(1);

      if (existingInvoices && existingInvoices.length > 0) {
        isDuplicate = true;
        duplicateOf = existingInvoices[0].id;
      }
    }

    // Check for existing format template
    let templateId = null;
    if (formatHash) {
      const { data: existingTemplate } = await supabase
        .from("format_templates")
        .select("id, usage_count")
        .eq("pattern_hash", formatHash)
        .single();

      if (existingTemplate) {
        templateId = existingTemplate.id;
        await supabase
          .from("format_templates")
          .update({ usage_count: existingTemplate.usage_count + 1 })
          .eq("id", existingTemplate.id);
      }
    }

    // Update invoice with extracted data
    const updateData = {
      vendor_name: vendorName,
      normalized_vendor_name: normalizedVendor,
      invoice_number: (extracted.invoice_number as string) || null,
      invoice_date: (extracted.invoice_date as string) || null,
      due_date: (extracted.due_date as string) || null,
      subtotal: extracted.subtotal != null ? Number(extracted.subtotal) : null,
      tax_amount: extracted.tax_amount != null ? Number(extracted.tax_amount) : null,
      total_amount: extracted.total_amount != null ? Number(extracted.total_amount) : null,
      currency: (extracted.currency as string) || "USD",
      confidence_score: extracted.confidence_score != null ? Number(extracted.confidence_score) : null,
      structured_data: extracted,
      raw_text: rawContent,
      format_hash: formatHash,
      is_duplicate: isDuplicate,
      duplicate_of: duplicateOf,
      status: "completed",
    };

    const { error: updateError } = await supabase
      .from("invoices")
      .update(updateData)
      .eq("id", invoiceId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error(`Failed to update invoice: ${updateError.message}`);
    }

    // Insert line items
    const lineItems = (extracted.line_items as Array<Record<string, unknown>>) || [];
    if (lineItems.length > 0) {
      const lineItemRows = lineItems.map((item) => ({
        invoice_id: invoiceId,
        description: (item.description as string) || null,
        quantity: item.quantity != null ? Number(item.quantity) : null,
        unit_price: item.unit_price != null ? Number(item.unit_price) : null,
        amount: item.amount != null ? Number(item.amount) : null,
      }));

      const { error: lineError } = await supabase
        .from("invoice_line_items")
        .insert(lineItemRows);

      if (lineError) {
        console.error("Line items insert error:", lineError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoiceId,
        extracted: updateData,
        lineItemsCount: lineItems.length,
        isDuplicate,
        formatHash,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("extract-invoice error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function normalizeVendorName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\b(inc|llc|ltd|corp|co|company|limited|incorporated)\b/g, "")
    .trim();
}

async function generateHash(input: string): Promise<string> {
  if (!input) return "";
  const encoder = new TextEncoder();
  const data = encoder.encode(input.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").substring(0, 16);
}
