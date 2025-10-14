import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface HiringRequest {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  industry: string;
  position: string;
  requirements: string;
  urgency: string;
  jobCategory?: string;
  ageRange?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: HiringRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Save to database
    const { data, error } = await supabase
      .from("hiring_requests")
      .insert({
        company_name: requestData.companyName,
        contact_person: requestData.contactPerson,
        email: requestData.email,
        phone: requestData.phone,
        industry: requestData.industry,
        position: requestData.position,
        requirements: requestData.requirements,
        urgency: requestData.urgency,
        job_category: requestData.jobCategory,
        age_range: requestData.ageRange,
        status: 'new'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save hiring request: ${error.message}`);
    }

    console.log("Hiring request saved successfully:", data.id);

    // Send emails in parallel for speed
    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 20px; background-color: #f8f9fa;">
          <img src="https://i.ibb.co/SwJPbKH/coshikowa-logo.png" alt="Coshikowa Agency" style="max-width: 200px; height: auto;" />
        </div>

        <div style="padding: 30px; background-color: white;">
          <h1 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px;">New Hiring Request</h1>

          <h2 style="color: #0284c7; margin-top: 25px;">Company Information</h2>
          <p><strong>Company Name:</strong> ${requestData.companyName}</p>
          <p><strong>Contact Person:</strong> ${requestData.contactPerson}</p>
          <p><strong>Email:</strong> ${requestData.email}</p>
          <p><strong>Phone:</strong> ${requestData.phone}</p>

          <h2 style="color: #0284c7; margin-top: 25px;">Hiring Details</h2>
          <p><strong>Industry:</strong> ${requestData.industry}</p>
          <p><strong>Position to Fill:</strong> ${requestData.position}</p>
          <p><strong>Urgency:</strong> ${requestData.urgency}</p>
          ${requestData.ageRange ? `<p><strong>Preferred Age Range:</strong> ${requestData.ageRange}</p>` : ''}

          <h2 style="color: #0284c7; margin-top: 25px;">Requirements</h2>
          <p style="line-height: 1.6;">${requestData.requirements}</p>

          <div style="margin-top: 30px; padding: 20px; background-color: #f0f9ff; border-left: 4px solid #0284c7;">
            <p style="margin: 0;"><strong>View in Dashboard:</strong></p>
            <p style="margin: 10px 0 0 0;">
              <a href="https://coshikowa.netlify.app/admin/dashboard" style="color: #0284c7; text-decoration: none;">Go to Admin Dashboard →</a>
            </p>
          </div>
        </div>

        <div style="text-align: center; padding: 20px; background-color: #f8f9fa; color: #6b7280; font-size: 12px;">
          <p>© 2025 Coshikowa Agency. All rights reserved.</p>
        </div>
      </div>
    `;

    const clientEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 20px; background-color: #f8f9fa;">
          <img src="https://i.ibb.co/SwJPbKH/coshikowa-logo.png" alt="Coshikowa Agency" style="max-width: 200px; height: auto;" />
        </div>

        <div style="padding: 30px; background-color: white;">
          <h1 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px;">Hiring Request Received</h1>

          <p>Dear ${requestData.contactPerson},</p>

          <p style="line-height: 1.6;">Thank you for submitting your hiring request for the position of <strong>${requestData.position}</strong>.</p>

          <p style="line-height: 1.6;">We have successfully received your request and our recruitment team will begin sourcing qualified candidates immediately. Based on your indicated urgency level (${requestData.urgency}), we will prioritize finding the right talent for your organization.</p>

          <div style="margin: 25px 0; padding: 20px; background-color: #f0f9ff; border-left: 4px solid #0284c7;">
            <h3 style="margin-top: 0; color: #0284c7;">Next Steps</h3>
            <ul style="line-height: 1.8; margin: 0;">
              <li>Our team will review your requirements in detail</li>
              <li>We'll start sourcing and screening candidates from our database</li>
              <li>You'll receive candidate profiles within 3-5 business days</li>
              <li>We'll arrange interviews with the most suitable candidates</li>
            </ul>
          </div>

          <p style="line-height: 1.6;">If you have any questions or need to update your requirements, please contact us at <a href="mailto:info@coshikowaagency.com" style="color: #0284c7;">info@coshikowaagency.com</a> or call us at your convenience.</p>

          <p style="margin-top: 30px;">Best regards,<br><strong>Coshikowa Agency Recruitment Team</strong></p>
        </div>

        <div style="text-align: center; padding: 20px; background-color: #f8f9fa; color: #6b7280; font-size: 12px;">
          <p>© 2025 Coshikowa Agency. All rights reserved.</p>
        </div>
      </div>
    `;

    // Send both emails concurrently for speed
    const [adminEmailResult, clientEmailResult] = await Promise.allSettled([
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "Coshikowa Agency <noreply@coshikowaagency.com>",
          to: ["info@coshikowaagency.com"],
          subject: `New Hiring Request - ${requestData.position}`,
          html: adminEmailHtml,
        }),
      }),
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "Coshikowa Agency <noreply@coshikowaagency.com>",
          to: [requestData.email],
          subject: "Hiring Request Received - Coshikowa Agency",
          html: clientEmailHtml,
        }),
      }),
    ]);

    if (adminEmailResult.status === 'fulfilled' && adminEmailResult.value.ok) {
      console.log("Admin email sent successfully");
    } else {
      console.error("Failed to send admin email:", adminEmailResult);
    }

    if (clientEmailResult.status === 'fulfilled' && clientEmailResult.value.ok) {
      console.log("Client confirmation email sent successfully");
    } else {
      console.error("Failed to send client email:", clientEmailResult);
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("Error in send-hiring-request function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An error occurred" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);