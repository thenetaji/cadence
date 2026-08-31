import type { SVGProps } from 'react'

function Glyph({ children, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const OverviewIcon = (props: SVGProps<SVGSVGElement>) => (
  <Glyph {...props}>
    <path d="M3 12l9-8 9 8" />
    <path d="M5 10v10h14V10" />
  </Glyph>
)

export const ActivityIcon = (props: SVGProps<SVGSVGElement>) => (
  <Glyph {...props}>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </Glyph>
)

export const PeopleIcon = (props: SVGProps<SVGSVGElement>) => (
  <Glyph {...props}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" />
    <path d="M17 8.5a3 3 0 0 1 0 5" />
  </Glyph>
)

export const IncomeIcon = (props: SVGProps<SVGSVGElement>) => (
  <Glyph {...props}>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M21 7v5h-5" />
  </Glyph>
)

export const PlusIcon = (props: SVGProps<SVGSVGElement>) => (
  <Glyph {...props}>
    <path d="M12 5v14M5 12h14" />
  </Glyph>
)

export const SettingsIcon = (props: SVGProps<SVGSVGElement>) => (
  <Glyph {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 11.5 4a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9 2 2 0 1 1 0 4z" />
  </Glyph>
)

export const BackIcon = (props: SVGProps<SVGSVGElement>) => (
  <Glyph {...props}>
    <path d="M15 5l-7 7 7 7" />
  </Glyph>
)

export const UploadIcon = (props: SVGProps<SVGSVGElement>) => (
  <Glyph {...props}>
    <path d="M12 16V4M7 9l5-5 5 5" />
    <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </Glyph>
)
