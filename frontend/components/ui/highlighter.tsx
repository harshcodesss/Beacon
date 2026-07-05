"use client"

import { useLayoutEffect, useRef } from "react"
import type React from "react"
import { useInView } from "motion/react"
import { annotate } from "rough-notation"
import { type RoughAnnotation } from "rough-notation/lib/model"

type AnnotationAction =
  | "highlight"
  | "underline"
  | "box"
  | "circle"
  | "strike-through"
  | "crossed-off"
  | "bracket"

interface HighlighterProps {
  children: React.ReactNode
  action?: AnnotationAction
  color?: string
  strokeWidth?: number
  animate?: boolean
  animationDuration?: number
  iterations?: number
  padding?: number
  multiline?: boolean
  isView?: boolean
}

export function Highlighter({
  children,
  action = "highlight",
  color = "#ffd1dc",
  strokeWidth = 1.5,
  animate = true,
  animationDuration = 600,
  iterations = 2,
  padding = 2,
  multiline = true,
  isView = false,
}: HighlighterProps) {
  const elementRef = useRef<HTMLSpanElement>(null)

  const isInView = useInView(elementRef, {
    once: true,
    margin: "-10%",
  })

  // If isView is false, always show. If isView is true, wait for inView
  const shouldShow = !isView || isInView

  useLayoutEffect(() => {
    const element = elementRef.current
    let annotation: RoughAnnotation | null = null
    let resizeObserver: ResizeObserver | null = null
    let settleTimer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    if (shouldShow && element) {
      const annotationConfig = {
        type: action,
        color,
        strokeWidth,
        animate,
        animationDuration,
        iterations,
        padding,
        multiline,
      }

      // rough-notation measures the element once when drawn, so wait for
      // webfonts and any entrance animation to settle before annotating;
      // on later size changes, rebuild the annotation from scratch.
      const draw = () => {
        if (cancelled) return
        annotation?.remove()
        annotation = annotate(element, annotationConfig)
        annotation.show()
      }

      document.fonts.ready.then(() => {
        settleTimer = setTimeout(() => {
          draw()
          resizeObserver = new ResizeObserver(draw)
          resizeObserver.observe(element)
        }, 1200)
      })
    }

    return () => {
      cancelled = true
      if (settleTimer) clearTimeout(settleTimer)
      annotation?.remove()
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
    }
  }, [
    shouldShow,
    action,
    color,
    strokeWidth,
    animationDuration,
    iterations,
    padding,
    multiline,
  ])

  return (
    <span ref={elementRef} className="relative inline-block bg-transparent">
      {children}
    </span>
  )
}
