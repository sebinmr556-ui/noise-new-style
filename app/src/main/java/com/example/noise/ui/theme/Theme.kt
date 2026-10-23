package com.example.noise.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val NoiseDarkColorScheme = darkColorScheme(
    primary = BrandCyan,
    onPrimary = Color.Black,
    primaryContainer = BrandIndigo.copy(alpha = 0.25f),
    onPrimaryContainer = BrandCyan,
    secondary = BrandPurple,
    onSecondary = Color.White,
    secondaryContainer = CardDark,
    onSecondaryContainer = BrandPurple,
    tertiary = BrandBlue,
    onTertiary = Color.White,
    background = BackgroundBlack,
    onBackground = TextPrimary,
    surface = SurfaceDark,
    onSurface = TextPrimary,
    surfaceVariant = CardDark,
    onSurfaceVariant = TextSecondary,
    outline = BorderDark,
    error = AccentRed,
    onError = Color.White
)

@Composable
fun NoiseTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    // Noise uses a signature high-contrast dark aesthetic
    MaterialTheme(
        colorScheme = NoiseDarkColorScheme,
        typography = Typography,
        content = content
    )
}
