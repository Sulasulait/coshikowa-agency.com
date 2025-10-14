import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://coshikowa.netlify.app";

    console.log("Approve payment function called with token:", token ? "present" : "missing");

    if (!token) {
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Invalid Request</title>
          </head>
          <body>
            <p>Invalid request. Redirecting...</p>
            <script>
              window.location.href = '${frontendUrl}/?error=no-token';
            </script>
          </body>
        </html>`,
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    console.log("Environment check - Supabase URL:", supabaseUrl ? "present" : "missing");
    console.log("Environment check - Service Key:", supabaseServiceKey ? "present" : "missing");
    console.log("Environment check - Resend Key:", resendApiKey ? "present" : "missing");

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("approval_token", token)
      .maybeSingle();

    if (fetchError) {
      console.error("Database error fetching payment:", fetchError);
      throw fetchError;
    }

    if (!payment) {
      console.log("No payment found with token");
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Invalid Token</title>
          </head>
          <body>
            <p>Invalid token. Redirecting...</p>
            <script>
              window.location.href = '${frontendUrl}/?error=invalid-token';
            </script>
          </body>
        </html>`,
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    console.log("Payment found:", payment.id, "Type:", payment.payment_type, "Status:", payment.payment_status);

    if (payment.payment_status === "completed") {
      console.log("Payment already completed");
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Already Approved</title>
          </head>
          <body>
            <p>Already approved. Redirecting...</p>
            <script>
              window.location.href = '${frontendUrl}/?already-approved=true';
            </script>
          </body>
        </html>`,
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    console.log("Updating payment status to completed...");
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        payment_status: "completed",
        reviewed_by: "admin_email",
        reviewed_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        admin_notes: "Approved via email",
      })
      .eq("id", payment.id);

    if (updateError) {
      console.error("Error updating payment:", updateError);
      throw updateError;
    }

    console.log("Payment status updated successfully");
    console.log("Calling edge function for type:", payment.payment_type);

    const edgeFunctionUrl = payment.payment_type === "job_application"
      ? `${supabaseUrl}/functions/v1/send-job-application`
      : `${supabaseUrl}/functions/v1/send-hiring-request`;

    console.log("Edge function URL:", edgeFunctionUrl);
    console.log("Form data:", JSON.stringify(payment.form_data));

    const functionResponse = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify(payment.form_data),
    });

    const responseText = await functionResponse.text();
    console.log("Edge function response status:", functionResponse.status);
    console.log("Edge function response:", responseText);

    if (!functionResponse.ok) {
      console.error("Edge function call failed with status:", functionResponse.status);
      console.error("Error response:", responseText);
      throw new Error(`Failed to submit application: ${responseText}`);
    }

    console.log("Application submitted successfully, sending customer notification...");

    const customerEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✓ Payment Approved</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <div class="success-box">
              <h3 style="margin-top: 0; color: #059669;">Your payment has been approved!</h3>
              <p style="margin-bottom: 0;">Your ${payment.payment_type === "job_application" ? "job application" : "hiring request"} has been successfully submitted to our team. We'll review it and get back to you shortly.</p>
            </div>
            <p><strong>Payment Details:</strong></p>
            <ul>
              <li>Amount: KES ${payment.amount_kes.toLocaleString()}</li>
              <li>Payment Method: ${payment.payment_method === 'mpesa' ? 'M-Pesa' : payment.payment_method === 'mobile_money_uganda' ? 'Mobile Money Uganda' : 'Bank Transfer'}</li>
              <li>Status: Approved</li>
            </ul>
            <p>Thank you for choosing Coshikowa Agency!</p>
          </div>
          <div class="footer">
            <p>Coshikowa Agency - Your trusted recruitment partner</p>
          </div>
        </body>
      </html>
    `;

    const customerEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Coshikowa Agency <noreply@coshikowaagency.com>",
        to: [payment.email],
        subject: "Payment Approved - Application Submitted",
        html: customerEmailHtml,
      }),
    });

    if (customerEmailResponse.ok) {
      console.log("Customer notification email sent successfully");
    } else {
      const emailError = await customerEmailResponse.text();
      console.error("Failed to send customer email:", emailError);
    }

    console.log("All operations completed successfully");

    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Payment Approved</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 20px;
              text-align: center;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              max-width: 500px;
            }
            .icon {
              width: 80px;
              height: 80px;
              background: #10b981;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 20px;
              font-size: 50px;
              color: white;
            }
            h1 { color: #059669; margin: 20px 0; }
            p { color: #6b7280; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✓</div>
            <h1>Payment Approved!</h1>
            <p>The payment has been approved successfully.</p>
            <p>The application has been submitted to info@coshikowaagency.com</p>
            <p>The applicant has also been notified via email.</p>
            <p style="margin-top: 30px; font-size: 14px;">Redirecting to homepage...</p>
          </div>
          <script>
            setTimeout(function() {
              window.location.href = '${frontendUrl}/?approved=true&type=${encodeURIComponent(payment.payment_type)}&amount=${encodeURIComponent(payment.amount_kes)}';
            }, 3000);
          </script>
        </body>
      </html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  } catch (error: unknown) {
    console.error("CRITICAL ERROR:", error);
    console.error("Error details:", error instanceof Error ? error.stack : String(error));
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://coshikowa.netlify.app";
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Error</title>
        </head>
        <body>
          <p>An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}. Please contact support at info@coshikowaagency.com</p>
          <script>
            setTimeout(function() {
              window.location.href = '${frontendUrl}/?error=processing-failed';
            }, 3000);
          </script>
        </body>
      </html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
});
