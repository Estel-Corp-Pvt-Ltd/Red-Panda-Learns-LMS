export default function LogoSpinner() {
  return (
    <img
      src="/android-chrome-512x512.png"
      alt="Loading..."
      className="w-16 h-16 animate-spin"
      style={{ animationDuration: "2.5s" }}
    />
  );
}
