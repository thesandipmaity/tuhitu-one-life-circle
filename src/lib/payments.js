import { apiRequest, ApiRequestError } from "./api";

let razorpayLoader;

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (razorpayLoader) return razorpayLoader;
  razorpayLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Payment checkout did not load."));
    script.onerror = () => reject(new Error("Payment checkout did not load."));
    document.head.append(script);
  });
  return razorpayLoader;
}

export async function beginPayment(request, { onDismiss } = {}) {
  const created = await apiRequest("/api/payments/order", { method: "POST", body: request });
  if (!created.paymentRequired) return created;
  const Razorpay = await loadRazorpay();
  const payment = created.payment;
  return new Promise((resolve, reject) => {
    const checkout = new Razorpay({
      key: payment.keyId,
      amount: payment.amount,
      currency: payment.currency,
      name: payment.name,
      description: payment.description,
      order_id: payment.orderId,
      prefill: payment.prefill,
      theme: { color: "#6134d6" },
      modal: {
        ondismiss: () => {
          onDismiss?.();
          reject(new ApiRequestError("Payment was not completed. You can try again from your account.", { code: "PAYMENT_CANCELLED" }));
        },
      },
      handler: async (response) => {
        try {
          const verification = await apiRequest("/api/payments/verify", { method: "POST", body: response });
          if (verification.pending) {
            reject(new ApiRequestError(verification.message || "Payment is awaiting final confirmation. Access has not been activated yet.", { code: "PAYMENT_PENDING", pending: true }));
            return;
          }
          resolve(verification);
        } catch (error) {
          reject(error);
        }
      },
    });
    checkout.on("payment.failed", (response) => {
      reject(new ApiRequestError(response.error?.description || "Payment failed. No access was activated.", { code: "PAYMENT_FAILED" }));
    });
    checkout.open();
  });
}
