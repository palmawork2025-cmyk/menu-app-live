import { useEffect, useRef, useState } from 'react'

/**
 * Touch/mouse-friendly manual drag-to-reorder for a vertical list, with no
 * external dependency. The dragged row becomes a `position: fixed` overlay
 * that follows the pointer exactly (so it never needs re-basing math), while
 * the underlying list reflows live as the pointer crosses sibling rows.
 *
 * @param ids current order of item ids, from the source of truth (props)
 * @param onCommit(newOrderIds) called on drop with the final order
 */
export function useDragReorder(ids, onCommit) {
  const [order, setOrder] = useState(ids)
  const [overlay, setOverlay] = useState(null) // { id, x, y, width, height, grabDX, grabDY }
  const rowRefs = useRef(new Map())
  const draggingIdRef = useRef(null)
  const orderRef = useRef(order)
  orderRef.current = order

  useEffect(() => {
    if (draggingIdRef.current) return // don't clobber order mid-drag
    setOrder(ids)
  }, [ids])

  function setRowRef(id, el) {
    if (el) rowRefs.current.set(id, el)
    else rowRefs.current.delete(id)
  }

  function handlePointerDown(id, e) {
    const row = rowRefs.current.get(id)
    if (!row) return
    e.preventDefault()
    const rect = row.getBoundingClientRect()
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingIdRef.current = id
    setOverlay({
      id,
      pointerId: e.pointerId,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      grabDX: e.clientX - rect.left,
      grabDY: e.clientY - rect.top,
    })
  }

  function handlePointerMove(e) {
    setOverlay((prev) => {
      if (!prev || prev.pointerId !== e.pointerId) return prev
      const next = { ...prev, x: e.clientX - prev.grabDX, y: e.clientY - prev.grabDY }

      const draggedCenterY = next.y + next.height / 2
      const others = orderRef.current.filter((id) => id !== next.id)
      const withCenters = others
        .map((id) => {
          const el = rowRefs.current.get(id)
          if (!el) return null
          const r = el.getBoundingClientRect()
          return { id, centerY: r.top + r.height / 2 }
        })
        .filter(Boolean)

      let newIndex = withCenters.length
      for (let i = 0; i < withCenters.length; i++) {
        if (draggedCenterY < withCenters[i].centerY) {
          newIndex = i
          break
        }
      }
      const newOrder = [...others.slice(0, newIndex), next.id, ...others.slice(newIndex)]
      if (newOrder.join() !== orderRef.current.join()) {
        orderRef.current = newOrder
        setOrder(newOrder)
      }
      return next
    })
  }

  function handlePointerUp(e) {
    setOverlay((prev) => {
      if (!prev || prev.pointerId !== e.pointerId) return prev
      draggingIdRef.current = null
      onCommit(orderRef.current)
      return null
    })
  }

  function dragHandleProps(id) {
    return {
      onPointerDown: (e) => handlePointerDown(id, e),
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    }
  }

  return { order, overlay, setRowRef, dragHandleProps }
}
