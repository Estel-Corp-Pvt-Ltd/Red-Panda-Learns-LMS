type Props = {
  message: string;
};

const LoadingSpinnerOverlay = ({ message }: Props) => {
  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-white/40 backdrop-blur-sm transition-opacity duration-300
">
      <div className="flex flex-col items-center">
        <img
          src="/android-chrome-512x512.png"
          alt="Loading..."
          className="w-16 h-16 animate-spin"
          style={{ animationDuration: "1.1s" }}
        />
        <p className="mt-4 text-xl font-medium">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinnerOverlay;
