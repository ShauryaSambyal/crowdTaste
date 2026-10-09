import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CARD_SHADOW, FONT, INK, INK_55, INK_70, PEACH, VIOLET, hexToRgba } from '../theme'

// A drop-in replacement for a native <select> that matches the site instead of
// the browser. It follows the ARIA combobox/listbox pattern: focus stays on the
// trigger button and the highlighted option is announced with
// aria-activedescendant, so arrow keys, Home/End, Enter/Space and Escape all
// work without moving focus into the popup.
const SortDropdown = ({ id, label = 'Sort by', value, options = [], onChange }) => {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef(null)

  const selected = options.find((option) => option.id === value) ?? options[0]
  const listId = `${id}-listbox`
  const labelId = `${id}-label`
  const optionId = (index) => `${id}-option-${index}`

  useEffect(() => {
    if (!open) return undefined
    setActiveIndex(Math.max(0, options.findIndex((option) => option.id === value)))
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, options, value])

  const commit = (index) => {
    const option = options[index]
    if (!option) return
    onChange(option.id)
    setOpen(false)
  }

  const onKeyDown = (event) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!open) setOpen(true)
        else setActiveIndex((current) => Math.min(options.length - 1, current + 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        if (!open) setOpen(true)
        else setActiveIndex((current) => Math.max(0, current - 1))
        break
      case 'Home':
        if (open) {
          event.preventDefault()
          setActiveIndex(0)
        }
        break
      case 'End':
        if (open) {
          event.preventDefault()
          setActiveIndex(options.length - 1)
        }
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (open) commit(activeIndex)
        else setOpen(true)
        break
      case 'Escape':
        if (open) {
          event.preventDefault()
          setOpen(false)
        }
        break
      case 'Tab':
        setOpen(false)
        break
      default:
        break
    }
  }

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      <span
        id={labelId}
        style={{ fontFamily: FONT, fontSize: '12.5px', fontWeight: 600, color: INK_70, whiteSpace: 'nowrap' }}
      >
        {label}
      </span>

      <button
        type="button"
        id={id}
        className="sort-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={`${labelId} ${id}`}
        aria-activedescendant={open ? optionId(activeIndex) : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onKeyDown}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          minWidth: '176px',
          padding: '9px 12px 9px 15px',
          borderRadius: '999px',
          border: `1px solid ${open ? hexToRgba(VIOLET, 0.5) : 'rgba(58,12,163,0.16)'}`,
          background: 'rgba(255,253,247,0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          fontFamily: FONT,
          fontSize: '12.5px',
          fontWeight: 600,
          color: INK,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span>{selected?.label}</span>
        <i
          className={open ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}
          aria-hidden="true"
          style={{ fontSize: '16px', color: INK_55 }}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.ul
            id={listId}
            role="listbox"
            aria-labelledby={labelId}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="list-none"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              zIndex: 60,
              minWidth: '212px',
              margin: 0,
              padding: '6px',
              borderRadius: '16px',
              border: '1px solid rgba(255,214,165,0.95)',
              background: 'rgba(255,253,247,0.97)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              boxShadow: CARD_SHADOW,
            }}
          >
            {options.map((option, index) => {
              const isSelected = option.id === value
              const isActive = index === activeIndex
              return (
                <li
                  key={option.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => commit(index)}
                  onMouseEnter={() => setActiveIndex(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    background: isActive ? hexToRgba(PEACH, 0.85) : 'transparent',
                    fontFamily: FONT,
                    fontSize: '12.5px',
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? VIOLET : INK,
                    cursor: 'pointer',
                  }}
                >
                  {option.label}
                  {isSelected ? <i className="ri-check-line" aria-hidden="true" style={{ fontSize: '15px' }} /> : null}
                </li>
              )
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default SortDropdown
