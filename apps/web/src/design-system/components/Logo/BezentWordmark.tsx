import type { SVGProps } from 'react';

export interface BezentWordmarkProps extends SVGProps<SVGSVGElement> {
  height?: number | string;
  width?: number | string;
  className?: string;
}

/**
 * Official BEZENT Ecosystem Brand Wordmark.
 * Extracted directly from the official brand vector definition (All Round Gothic letterforms).
 * Aspect ratio: 3278 / 723 ≈ 4.533886.
 */
export function BezentWordmark({
  height = 20,
  width,
  className = '',
  ...props
}: BezentWordmarkProps) {
  const computedWidth =
    width ?? (typeof height === 'number' ? Math.round(height * (3278 / 723)) : undefined);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3278 723"
      fill="currentColor"
      height={height}
      width={computedWidth}
      className={`bezent-wordmark ${className}`.trim()}
      aria-label="bezent"
      role="img"
      {...props}
    >
      <path d="M263 723C420 723 530 615 530 460C530 296 408 203 279 203C199 203 131 239 95 303V0H0V459C0 620 110 723 263 723ZM264 635C163 635 95 563 95 463C95 363 163 291 264 291C366 291 434 363 434 463C434 563 366 635 264 635Z M854 723C969 723 1059 664 1097 572H992C963 615 918 635 854 635C768 635 702 586 688 498H1118V463C1118 313 1010 203 854 203C698 203 588 313 588 463C588 613 698 723 854 723ZM691 413C710 335 772 291 854 291C934 291 999 334 1018 413Z M1173 710H1628V625H1300L1618 294V216H1188V301H1491L1173 632Z M1954 723C2069 723 2159 664 2197 572H2092C2063 615 2018 635 1954 635C1868 635 1802 586 1788 498H2218V463C2218 313 2110 203 1954 203C1798 203 1688 313 1688 463C1688 613 1798 723 1954 723ZM1791 413C1810 335 1872 291 1954 291C2034 291 2099 334 2118 413Z M2296 710H2391V453C2391 346 2450 291 2540 291C2630 291 2689 346 2689 453V710H2784V453C2784 287 2686 203 2540 203C2394 203 2296 288 2296 453Z M3080 723C3198 723 3278 657 3278 523V512H3184V523C3184 602 3142 635 3080 635C3018 635 2977 601 2977 523V303H3249V216H2977V41H2882V523C2882 657 2962 723 3080 723Z" />
    </svg>
  );
}

export default BezentWordmark;
