interface LogoProps {
  className?: string;
}

export const Logo = ({ className = "" }: LogoProps) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 rounded-lg overflow-hidden">
        <img
          src="https://www.RedPanda Learns.com/lovable-uploads/4759bf6b-47a5-457f-8246-61d08da3288d.png"
          alt="Logo"
          className="w-full h-full object-cover"
        />
      </div>
      <span className="text-xl font-bold text-foreground">RedPanda Learns</span>
    </div>
  );
};
