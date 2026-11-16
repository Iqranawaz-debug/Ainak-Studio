const PADDINGS = {
  none: '',
  sm: 'p-2',
  md: 'p-gutter',
  lg: 'p-section',
}

// The one rounded panel used everywhere.
//   raised: adds the soft shadow
//   as: the element to render
//   border: replaces the usual border, for a selected card
function Card({ as: Tag = 'div', padding = 'md', raised = false, border = 'border border-ink/15', className = '', children, ...props }) {
  return (
    <Tag className={`rounded-card bg-ivory ${border} ${PADDINGS[padding]} ${raised ? 'shadow-card' : ''} ${className}`} {...props}>
      {children}
    </Tag>
  )
}

export default Card
