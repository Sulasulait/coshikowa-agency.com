import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManualPaymentOption } from "@/components/ManualPaymentOption";

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || "test";
const KES_TO_USD_RATE = 0.0078;
const AMOUNT_KES = 3000;
const AMOUNT_USD = (AMOUNT_KES * KES_TO_USD_RATE).toFixed(2);

const PaymentHiringRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const formData = location.state?.formData;

  useEffect(() => {
    if (!formData) {
      toast({
        title: "Missing Information",
        description: "Please fill out the hiring request form first.",
        variant: "destructive",
      });
      navigate("/find-talent");
      return;
    }

    const createPaymentRecord = async () => {
      try {
        const { data: payment, error } = await supabase
          .from("payments")
          .insert({
            payment_type: "hiring_request",
            amount_kes: AMOUNT_KES,
            amount_usd: parseFloat(AMOUNT_USD),
            payment_status: "pending",
            form_data: formData,
            email: formData.email,
          })
          .select()
          .maybeSingle();

        if (error) throw error;
        if (!payment) throw new Error("Failed to create payment record");
        setPaymentId(payment.id);
      } catch (error) {
        console.error("Error creating payment record:", error);
        toast({
          title: "Error",
          description: "Failed to initialize payment. Please try again.",
          variant: "destructive",
        });
      }
    };

    createPaymentRecord();
  }, [formData, navigate, toast]);

  const onApprove = async (data: { orderID: string; payerID: string }) => {
    setIsProcessing(true);
    try {
      navigate("/payment-success", {
        state: { type: "hiring_request" },
      });

      if (paymentId) {
        supabase
          .from("payments")
          .update({
            payment_status: "completed",
            paypal_order_id: data.orderID,
            paypal_payer_id: data.payerID,
            completed_at: new Date().toISOString(),
          })
          .eq("id", paymentId)
          .then(({ error }) => {
            if (error) console.error("Error updating payment:", error);
          });
      }

      callEdgeFunction("send-hiring-request", formData).catch((error) => {
        console.error("Error sending request:", error);
      });
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "Payment Processing Error",
        description: "Payment completed but there was an error. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const onCancel = () => {
    toast({
      title: "Payment Cancelled",
      description: "Your payment was cancelled. You can try again when ready.",
    });
    navigate("/find-talent");
  };

  const onError = (err: { message?: string }) => {
    console.error("PayPal Error:", err);

    let errorMessage = "There was an error processing your payment. Please try again.";

    if (err?.message?.includes("PAYEE_ACCOUNT_RESTRICTED")) {
      errorMessage = "Payment system is currently under maintenance. Please contact support at support@coshikowa.com or try again later.";
    } else if (err?.message?.includes("UNPROCESSABLE_ENTITY")) {
      errorMessage = "Unable to process payment at this time. Please contact support for assistance.";
    }

    toast({
      title: "Payment Error",
      description: errorMessage,
      variant: "destructive",
    });
  };

  if (!formData) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-12 bg-muted">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="p-8 md:p-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4">Complete Your Payment</h1>
              <p className="text-muted-foreground mb-6">
                To submit your hiring request, please complete the payment below.
              </p>

              <div className="bg-gradient-to-r from-blue-50 to-emerald-50 p-6 rounded-lg border border-blue-200 mb-6">
                <div className="text-2xl font-bold text-blue-700 mb-2">
                  KES {AMOUNT_KES.toLocaleString()} / UGX {Math.round(parseFloat(AMOUNT_USD) * 3700).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  (Approximately ${AMOUNT_USD} USD)
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  One-time hiring request fee
                </p>
              </div>

              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 mb-6 text-left">
                <h3 className="font-semibold mb-2">Request Summary:</h3>
                <p className="text-sm"><strong>Company:</strong> {formData.companyName}</p>
                <p className="text-sm"><strong>Contact:</strong> {formData.contactPerson}</p>
                <p className="text-sm"><strong>Email:</strong> {formData.email}</p>
                <p className="text-sm"><strong>Position:</strong> {formData.position}</p>
              </div>
            </div>

            {paymentSubmitted ? (
              <Card className="p-8 text-center">
                <div className="bg-green-50 text-green-700 p-6 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">Payment Proof Submitted</h3>
                  <p className="text-sm">
                    Your payment is under review. We'll process your hiring request and contact you once approved (usually within 30 minutes).
                  </p>
                </div>
              </Card>
            ) : isProcessing || !paymentId ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">{isProcessing ? "Processing payment..." : "Preparing payment..."}</span>
              </div>
            ) : (
              <Tabs defaultValue="manual" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="paypal" disabled>PayPal</TabsTrigger>
                  <TabsTrigger value="manual">M-Pesa / Bank</TabsTrigger>
                </TabsList>

                <TabsContent value="paypal">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <h3 className="font-semibold text-yellow-800 mb-2">PayPal Under Maintenance</h3>
                    <p className="text-sm text-yellow-700">
                      PayPal payment is currently unavailable. Please use M-Pesa or Bank Transfer to complete your payment.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="manual">
                  <ManualPaymentOption
                    paymentId={paymentId}
                    amountKES={AMOUNT_KES}
                    amountUSD={parseFloat(AMOUNT_USD)}
                    onPaymentSubmitted={() => setPaymentSubmitted(true)}
                    formData={formData}
                  />
                </TabsContent>
              </Tabs>
            )}

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Secure payment options available</p>
              <p className="mt-2">
                After payment verification, your hiring request will be processed.
              </p>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentHiringRequest;
