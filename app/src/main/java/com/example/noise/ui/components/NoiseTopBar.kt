package com.example.noise.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.noise.ui.theme.*

@Composable
fun NoiseTopBar(
    coinsBalance: Int,
    unreadDMs: Boolean = true,
    unreadNotifs: Boolean = true,
    onCoinsClick: () -> Unit,
    onDMsClick: () -> Unit,
    onNotificationsClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Logo + App Name with Brand Gradient
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.testTag("app_logo")
        ) {
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(BrandGradient),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.GraphicEq,
                    contentDescription = "Noise Audio Icon",
                    tint = Color.Black,
                    modifier = Modifier.size(20.dp)
                )
            }
            Text(
                text = "Noise",
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = (-0.5).sp
                ),
                color = BrandCyan
            )
        }

        // Actions: Coins, DMs, Notifications
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Coins Pill
            Surface(
                onClick = onCoinsClick,
                shape = RoundedCornerShape(20.dp),
                color = CardDark,
                border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark),
                modifier = Modifier.testTag("coins_button")
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.MonetizationOn,
                        contentDescription = "Noise Coins",
                        tint = AccentAmber,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "$coinsBalance",
                        style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                        color = TextPrimary
                    )
                }
            }

            // Notifications
            Box {
                IconButton(
                    onClick = onNotificationsClick,
                    modifier = Modifier
                        .size(40.dp)
                        .testTag("notifications_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Notifications,
                        contentDescription = "Notifications",
                        tint = TextPrimary
                    )
                }
                if (unreadNotifs) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(top = 6.dp, end = 6.dp)
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(AccentRed)
                    )
                }
            }

            // Direct Messages
            Box {
                IconButton(
                    onClick = onDMsClick,
                    modifier = Modifier
                        .size(40.dp)
                        .testTag("direct_messages_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Send,
                        contentDescription = "Direct Messages",
                        tint = TextPrimary
                    )
                }
                if (unreadDMs) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(top = 6.dp, end = 6.dp)
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(BrandCyan)
                    )
                }
            }
        }
    }
}
