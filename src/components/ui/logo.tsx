interface LogoProps {
  className?: string;
}

export const Logo = ({ className = "" }: LogoProps) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 bg-gradient-to-br from-brand-fuchsia to-brand-blue rounded-lg flex items-center justify-center">
        <div className="w-4 h-4 bg-white rounded-sm"></div>
      </div>
      <span className="text-xl font-bold text-foreground">Vizuara</span>
    </div>
  );
};