import { SpinnerIcon } from './Icons.jsx'
import Tooltip from './Tooltip.jsx'

// Shared by every button: the focus ring comes from :focus-visible in index.css
const BASE =
  'inline-flex cursor-pointer items-center justify-center gap-2 font-medium whitespace-nowrap transition-transform duration-100 active:scale-[0.97] motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'

const VARIANTS = {
  primary: 'bg-coral text-ink hover:bg-coral/90 active:bg-coral/80 disabled:hover:bg-coral',
  secondary: 'border border-ink/15 bg-ivory text-ink hover:bg-ivory-hover active:bg-ivory-pressed disabled:hover:bg-ivory',
  ghost: 'text-ink hover:bg-ink/5 active:bg-ink/10 disabled:hover:bg-transparent',
}

const SIZES = {
  sm: 'rounded-control px-3 py-1.5 text-label max-lg:py-2',
  md: 'rounded-control px-4 py-2.5 text-label',
  lg: 'rounded-control px-5 py-3',
}

// Icon buttons are square, or round when small or large
const ICON_SIZES = {
  sm: 'size-8 rounded-pill',
  md: 'size-10 rounded-control lg:size-9',
  lg: 'size-12 rounded-pill',
}

// A button or button-styled link.
//   variant: 'primary', 'secondary', 'ghost' or 'icon'
//   as: what to render instead of a button, such as 'a' or a router Link
//   loading: shows a spinner and can't be pressed again until the work is done
// An icon button needs a label, which becomes its name and tooltip. Its look is set by emphasis.
function Button({ variant = 'secondary', size, as: Tag = 'button', emphasis = 'secondary', label, loading = false, className = '', children, ...props }) {
  const buttonProps = Tag === 'button' ? { type: 'button', ...props } : props
  if (loading) {
    buttonProps.disabled = true
    buttonProps['aria-busy'] = true
  }

  if (variant === 'icon') {
    return (
      <Tooltip label={label}>
        <Tag aria-label={label} className={`${BASE} ${VARIANTS[emphasis]} ${ICON_SIZES[size ?? 'md']} ${className}`} {...buttonProps}>
          {children}
        </Tag>
      </Tooltip>
    )
  }

  return (
    <Tag className={`${BASE} ${VARIANTS[variant]} ${SIZES[size ?? 'md']} ${className}`} {...buttonProps}>
      {loading && <SpinnerIcon />}
      {children}
    </Tag>
  )
}

export default Button
