# DESIGN.md: LMS SMA Negeri Prabsky 02 Konoha

Direction chosen by the owner: **"Ruang guru yang hangat"** (a warm staff room). The concrete
values below were drafted by the agent from that choice. Agent-drafted style tends toward
default AI taste, so treat these values as a first proposal the owner can overwrite.

Dial: ENERGY 2 / RHYTHM 2 / MOTION 1

## Identity

A school administration tool used daily by teachers, homeroom teachers (wali kelas), staff and
students. It should feel like a well-kept teacher's desk: paper, ink, a chalkboard, a highlighter.
Calm enough to enter grades for an hour, warm enough that it does not feel like a tax form.

## Palette (2 core + 1 accent, plus neutrals)

| Role | Light ("kertas") | Dark ("papan tulis malam") | Why |
|---|---|---|---|
| Paper (neutral base) | `#F8F4EC` | `#18221E` | Warm off-white reads as a page, not a screen; dark mode is the chalkboard itself. |
| Ink (neutral text) | `#2B2620` | `#ECE6D8` | Brown-black ink is softer than pure black on warm paper and still clears WCAG AA. |
| Core: chalkboard green | `#2F5D50` | `#8CC5AE` | The colour of a school blackboard. Used for primary actions and the active nav item. |
| Accent: highlighter | `#F2C94C` | `#7A5C16` | A teacher's highlighter. Only behind the key word of each page title (one per screen). Never as text colour. |
| Destructive | `#A93226` | `#E8806F` | Semantic only (delete, errors). Not part of the palette. |

## Typography

- Headings: **Fraunces** (soft, slightly "wonky" serif). It has the voice of a printed school
  report and handwriting warmth without being cute.
- Body and tables: **Atkinson Hyperlegible Next**. Designed for legibility; this app is read by
  teachers of every age and by students on cheap phones, and it is mostly names and numbers.
- No monospace and no wide-tracked uppercase labels.

## Identity motif

The **highlighter stroke**: each page title marks its key word with a slightly skewed highlighter
swash, the way a teacher marks the important word on a worksheet. It appears once per screen and
is the focal point. Section headings inside a page use a thin double rule underneath, borrowed
from the ruled lines of a rapor (report card).

## Shape, depth, motion

- Radius: 6px on cards, inputs and buttons; 4px on small status labels. Nothing pill-shaped.
- Shadow: none on cards (paper lies flat on the desk). Only dialogs and menus get a shadow,
  because they genuinely float above the page.
- Motion 1: colour transitions on hover and focus only. No entrance animations.

## Icons

Phosphor (regular weight). Its slightly heavier, rounder strokes match the paper-and-ink feel
better than hairline icon sets. Icons appear in the navigation and in a few action buttons only,
always next to a text label.

## Theme

Light is the default (most use is in daylight in a school office). Dark ("papan tulis malam") is
offered through a toggle for evening grading at home.

## Logo

No logo was supplied. The school name is set in Fraunces as a text wordmark until the owner
provides the official emblem.
