import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface JobApplication {
  fullName: string;
  email: string;
  phone: string;
  location?: string;
  education?: string;
  experience?: string;
  skills?: string;
  desiredPosition: string;
  salary?: string;
  availability?: string;
  additionalInfo?: string;
  dateOfBirth?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const applicationData: JobApplication = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Save to database
    const { data, error } = await supabase
      .from("job_applications")
      .insert({
        full_name: applicationData.fullName,
        email: applicationData.email,
        phone: applicationData.phone,
        location: applicationData.location,
        education: applicationData.education,
        experience: applicationData.experience,
        skills: applicationData.skills,
        desired_position: applicationData.desiredPosition,
        salary: applicationData.salary,
        availability: applicationData.availability,
        additional_info: applicationData.additionalInfo,
        date_of_birth: applicationData.dateOfBirth,
        status: 'new'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save application: ${error.message}`);
    }

    console.log("Application saved successfully:", data.id);

    // Send emails in parallel for speed
    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 20px; background-color: #f8f9fa;">
          <img src="https://i.ibb.co/SwJPbKH/coshikowa-logo.png" alt="Coshikowa Agency" style="max-width: 200px; height: auto;" />
        </div>

        <div style="padding: 30px; background-color: white;">
          <h1 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px;">New Job Application</h1>

          <h2 style="color: #0284c7; margin-top: 25px;">Personal Information</h2>
          <p><strong>Full Name:</strong> ${applicationData.fullName}</p>
          <p><strong>Email:</strong> ${applicationData.email}</p>
          <p><strong>Phone:</strong> ${applicationData.phone}</p>
          ${applicationData.location ? `<p><strong>Location:</strong> ${applicationData.location}</p>` : ''}
          ${applicationData.dateOfBirth ? `<p><strong>Date of Birth:</strong> ${applicationData.dateOfBirth}</p>` : ''}

          <h2 style="color: #0284c7; margin-top: 25px;">Professional Background</h2>
          ${applicationData.education ? `<p><strong>Education:</strong> ${applicationData.education}</p>` : ''}
          ${applicationData.experience ? `<p><strong>Experience:</strong> ${applicationData.experience}</p>` : ''}
          ${applicationData.skills ? `<p><strong>Skills:</strong> ${applicationData.skills}</p>` : ''}

          <h2 style="color: #0284c7; margin-top: 25px;">Job Preferences</h2>
          <p><strong>Desired Position:</strong> ${applicationData.desiredPosition}</p>
          ${applicationData.salary ? `<p><strong>Expected Salary:</strong> ${applicationData.salary}</p>` : ''}
          ${applicationData.availability ? `<p><strong>Availability:</strong> ${applicationData.availability}</p>` : ''}

          ${applicationData.additionalInfo ? `
            <h2 style="color: #0284c7; margin-top: 25px;">Additional Information</h2>
            <p style="line-height: 1.6;">${applicationData.additionalInfo}</p>
          ` : ''}

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

    const applicantEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 20px; background-color: #f8f9fa;">
          <img src="https://i.ibb.co/SwJPbKH/coshikowa-logo.png" alt="Coshikowa Agency" style="max-width: 200px; height: auto;" />
        </div>

        <div style="padding: 30px; background-color: white;">
          <h1 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px;">Application Received</h1>

          <p>Dear ${applicationData.fullName},</p>

          <p style="line-height: 1.6;">Thank you for applying for the position of <strong>${applicationData.desiredPosition}</strong> at Coshikowa Agency.</p>

          <p style="line-height: 1.6;">We have successfully received your application and our team will review it carefully. If your qualifications match our requirements, we will contact you within 5-7 business days to discuss the next steps.</p>

          <div style="margin: 25px 0; padding: 20px; background-color: #f0f9ff; border-left: 4px solid #0284c7;">
            <h3 style="margin-top: 0; color: #0284c7;">What happens next?</h3>
            <ul style="line-height: 1.8; margin: 0;">
              <li>Our recruitment team will review your application</li>
              <li>Qualified candidates will be contacted for an interview</li>
              <li>We will keep your application on file for future opportunities</li>
            </ul>
          </div>

          <p style="line-height: 1.6;">If you have any questions, please feel free to contact us at <a href="mailto:info@coshikowaagency.com" style="color: #0284c7;">info@coshikowaagency.com</a>.</p>

          <p style="margin-top: 30px;">Best regards,<br><strong>Coshikowa Agency Recruitment Team</strong></p>
        </div>

        <div style="text-align: center; padding: 20px; background-color: #f8f9fa; color: #6b7280; font-size: 12px;">
          <p>© 2025 Coshikowa Agency. All rights reserved.</p>
        </div>
      </div>
    `;

    // Send both emails concurrently for speed
    const [adminEmailResult, applicantEmailResult] = await Promise.allSettled([
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "Coshikowa Agency <noreply@coshikowaagency.com>",
          to: ["info@coshikowaagency.com"],
          subject: `New Job Application - ${applicationData.desiredPosition}`,
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
          to: [applicationData.email],
          subject: "Application Received - Coshikowa Agency",
          html: applicantEmailHtml,
        }),
      }),
    ]);

    if (adminEmailResult.status === 'fulfilled' && adminEmailResult.value.ok) {
      console.log("Admin email sent successfully");
    } else {
      console.error("Failed to send admin email:", adminEmailResult);
    }

    if (applicantEmailResult.status === 'fulfilled' && applicantEmailResult.value.ok) {
      console.log("Applicant confirmation email sent successfully");
    } else {
      console.error("Failed to send applicant email:", applicantEmailResult);
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("Error in send-job-application function:", error);
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