type Props = {
  message: string;
};

const LoadingSpinnerOverlay = ({ message }: Props) => {
  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-background/80 backdrop-blur-sm transition-opacity duration-300">
      <div className="flex flex-col items-center">
        <span className="text-7xl animate-bounce" style={{ animationDuration: "0.8s" }}>🐼</span>
        <p className="mt-4 text-xl font-medium text-foreground">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinnerOverlay;
