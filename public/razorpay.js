
// Add Razorpay script to the page
(function() {
  if (typeof window !== 'undefined' && !window.Razorpay) {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.head.appendChild(script);
  }
})();
