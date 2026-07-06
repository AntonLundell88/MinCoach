"use client";

type AppTheme = "dark" | "light";

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  theme?: AppTheme;
  size?: "sm" | "md";
  className?: string;
};

export default function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  theme = "dark",
  size = "md",
  className = "",
}: ToggleSwitchProps) {
  const isLight = theme === "light";
  const isSmall = size === "sm";

  const trackClassName = checked
    ? "bg-[#2f6df6] shadow-[0_0_22px_rgba(47,109,246,0.28)] ring-1 ring-blue-200/20"
    : isLight
    ? "bg-[#e8ddd0] shadow-[inset_0_0_0_1px_rgba(92,70,45,0.10)] ring-1 ring-[#7a6548]/10"
    : "bg-[#263241] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),0_8px_18px_rgba(0,0,0,0.18)] ring-1 ring-white/10";

  const knobClassName = checked
    ? "translate-x-full bg-white shadow-[0_7px_16px_rgba(0,0,0,0.20)]"
    : isLight
    ? "translate-x-0 bg-white shadow-[0_6px_14px_rgba(92,70,45,0.16)]"
    : "translate-x-0 bg-white/40 shadow-[0_6px_14px_rgba(0,0,0,0.34)]";

  const labelClassName = isLight ? "text-[#2d251c]" : "text-white/86";
  const descriptionClassName = isLight ? "text-[#756655]" : "text-white/42";

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      {label ? (
        <div className="min-w-0">
          <p className={`text-sm font-semibold leading-5 ${labelClassName}`}>{label}</p>
          {description ? (
            <p className={`mt-0.5 text-xs leading-5 ${descriptionClassName}`}>{description}</p>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label ?? "Växla"}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 rounded-full transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6ea0ff]/70 disabled:cursor-not-allowed disabled:opacity-45 ${
          isSmall ? "h-7 w-12 p-1" : "h-8 w-[3.55rem] p-1"
        } ${trackClassName}`}
      >
        <span
          className={`block rounded-full transition duration-200 ${
            isSmall ? "h-5 w-5" : "h-6 w-6"
          } ${knobClassName}`}
        />
      </button>
    </div>
  );
}

