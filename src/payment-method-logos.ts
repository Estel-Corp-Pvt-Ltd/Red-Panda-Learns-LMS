import { PaymentProvider } from "./types/general";

export const METHOD_LOGOS: Record<
    PaymentProvider,
    { name: string; src: string; className?: string }[]
> = {
    RAZORPAY: [
        { name: "UPI", src: "/upi.webp", className: "h-[30px] w-[32px]" },
        { name: "Visa", src: "/visa.png", className: "h-[20px] w-[32px]" },
        {
            name: "Mastercard",
            src: "/mastercard.svg",
            className: "h-[20px] w-[32px]",
        },
        { name: "RuPay", src: "/rupay.png", className: "h-[30px] w-[40px]" },
    ],
};
