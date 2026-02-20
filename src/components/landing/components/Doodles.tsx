/* Hand-drawn SVG doodle decorations used throughout the landing page */

export function SquiggleLine({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 20"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 10 C20 2, 40 18, 60 10 S100 2, 120 10 S160 18, 180 10 S200 2, 198 10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WavyUnderline({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 20"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <path
        d="M2 12 C40 2, 70 20, 110 10 S170 2, 200 14 S260 4, 298 12"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DoodleCloud({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 50"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 40 C8 40, 2 32, 10 24 C4 18, 10 8, 22 10 C26 2, 40 0, 48 6 C56 0, 70 4, 70 14 C78 16, 80 26, 72 32 C78 38, 70 44, 60 40 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.08"
      />
    </svg>
  );
}

export function DoodleStar({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 2 L24 14 L37 14 L27 22 L30 35 L20 27 L10 35 L13 22 L3 14 L16 14 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.15"
      />
    </svg>
  );
}

export function DoodlePencil({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 60"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="4"
        y="8"
        width="16"
        height="38"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <polygon
        points="4,46 20,46 12,58"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.06"
      />
      <rect
        x="4"
        y="8"
        width="16"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.2"
      />
    </svg>
  );
}

export function DoodleSpiral({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 50 50"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M25 25 C25 20, 30 18, 33 22 C36 26, 32 32, 27 32 C20 32, 16 26, 18 20 C20 12, 30 10, 36 16 C42 22, 38 34, 28 36 C16 38, 10 28, 14 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DoodleArrow({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 30"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 18 C15 16, 30 12, 48 14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M42 8 L50 14 L42 22"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DoodleHeart({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 36"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 34 C14 28, 2 20, 2 12 C2 6, 8 2, 14 4 C17 5, 19 8, 20 10 C21 8, 23 5, 26 4 C32 2, 38 6, 38 12 C38 20, 26 28, 20 34 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.12"
      />
    </svg>
  );
}

export function DoodleCircle({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 50 50"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="25"
        cy="25"
        r="20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 6"
      />
    </svg>
  );
}

export function DoodleZigzag({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 16"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <path
        d="M0 8 L10 2 L20 14 L30 2 L40 14 L50 2 L60 14 L70 2 L80 14 L90 2 L100 14 L110 2 L120 14 L130 2 L140 14 L150 2 L160 14 L170 2 L180 14 L190 2 L200 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Pushpin({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 30 40"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="15"
        cy="12"
        r="10"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
      />
      <circle cx="15" cy="12" r="4" fill="white" fillOpacity="0.4" />
      <line
        x1="15"
        y1="22"
        x2="15"
        y2="38"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

export function ChalkDoodle({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 30"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="5"
        y="22"
        fontFamily="serif"
        fontSize="20"
        fill="currentColor"
        opacity="0.3"
      >
        A B C
      </text>
    </svg>
  );
}

export function MathDoodle({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 30"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="5"
        y="22"
        fontFamily="serif"
        fontSize="18"
        fill="currentColor"
        opacity="0.25"
      >
        2+2=4
      </text>
    </svg>
  );
}
