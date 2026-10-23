package com.example.noise.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

val BackgroundBlack = Color(0xFF000000)
val SurfaceDark = Color(0xFF09090B)
val CardDark = Color(0xFF141418)
val ElevatedDark = Color(0xFF1F1F24)
val BorderDark = Color(0xFF27272A)

val BrandCyan = Color(0xFF00D4FF)
val BrandBlue = Color(0xFF3B82F6)
val BrandIndigo = Color(0xFF6366F1)
val BrandPurple = Color(0xFFA855F7)
val BrandPink = Color(0xFFEC4899)

val AccentRed = Color(0xFFEF4444)
val AccentGreen = Color(0xFF10B981)
val AccentAmber = Color(0xFFF59E0B)

val TextPrimary = Color(0xFFF4F4F5)
val TextSecondary = Color(0xFFA1A1AA)
val TextMuted = Color(0xFF71717A)

val StoryGradient = Brush.linearGradient(
    colors = listOf(BrandCyan, BrandBlue, BrandIndigo, BrandPurple)
)

val BrandGradient = Brush.horizontalGradient(
    colors = listOf(BrandCyan, BrandBlue, BrandPurple)
)

val LivePulseGradient = Brush.radialGradient(
    colors = listOf(BrandCyan.copy(alpha = 0.5f), Color.Transparent)
)
