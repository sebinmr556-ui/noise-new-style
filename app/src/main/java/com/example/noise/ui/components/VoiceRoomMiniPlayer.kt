package com.example.noise.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.noise.model.VoiceRoom
import com.example.noise.ui.theme.*

@Composable
fun VoiceRoomMiniPlayer(
    room: VoiceRoom,
    isMuted: Boolean,
    onMuteToggle: () -> Unit,
    onMaximize: () -> Unit,
    onLeave: () -> Unit,
    modifier: Modifier = Modifier
) {
    // Pulse animation for speaking status
    val infiniteTransition = rememberInfiniteTransition(label = "mini_wave")
    val waveScale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 1.25f,
        animationSpec = infiniteRepeatable(
            animation = tween(700, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "wave_scale"
    )

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = CardDark,
        border = androidx.compose.foundation.BorderStroke(1.dp, BrandCyan.copy(alpha = 0.5f)),
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp)
            .clickable { onMaximize() }
            .testTag("voice_room_mini_player")
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Avatar + Live Pulse Ring + Info
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier.size(36.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size((36 * waveScale).dp)
                            .clip(CircleShape)
                            .background(BrandCyan.copy(alpha = 0.25f))
                    )
                    AsyncImage(
                        model = room.hostAvatar,
                        contentDescription = room.hostDisplayName,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .border(1.5.dp, BrandCyan, CircleShape)
                    )
                }

                Column {
                    Text(
                        text = room.title,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        ),
                        color = TextPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "Live • ${room.speakers.size} on stage",
                        style = MaterialTheme.typography.labelSmall,
                        color = BrandCyan,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            // Controls: Mic Mute toggle & Close button
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                IconButton(
                    onClick = onMuteToggle,
                    modifier = Modifier
                        .size(36.dp)
                        .testTag("mini_mute_toggle")
                ) {
                    Icon(
                        imageVector = if (isMuted) Icons.Default.MicOff else Icons.Default.Mic,
                        contentDescription = "Mute Toggle",
                        tint = if (isMuted) AccentRed else AccentGreen,
                        modifier = Modifier.size(20.dp)
                    )
                }

                IconButton(
                    onClick = onLeave,
                    modifier = Modifier
                        .size(36.dp)
                        .testTag("mini_leave_room")
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Leave Room",
                        tint = TextSecondary,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}
