package com.example.noise.ui.dialogs

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.example.noise.model.RoomMessage
import com.example.noise.model.RoomParticipant
import com.example.noise.model.VoiceRoom
import com.example.noise.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VoiceRoomDialog(
    room: VoiceRoom,
    isMuted: Boolean,
    messages: List<RoomMessage>,
    coinsBalance: Int,
    onMuteToggle: () -> Unit,
    onMinimize: () -> Unit,
    onLeave: () -> Unit,
    onSendMessage: (String) -> Unit,
    onSendReaction: (String) -> Unit,
    onTipHost: (Int) -> Unit
) {
    var messageInput by remember { mutableStateOf("") }
    var hasRaisedHand by remember { mutableStateOf(false) }

    // Waveform pulse for active speakers
    val infiniteTransition = rememberInfiniteTransition(label = "audio_glow")
    val pulseSize by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 1.35f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse_size"
    )

    Dialog(
        onDismissRequest = onMinimize,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = SurfaceDark
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
                    .navigationBarsPadding()
            ) {
                // Top Room Bar: Minimize, Room Title, Leave
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onMinimize,
                        modifier = Modifier.testTag("minimize_room_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.KeyboardArrowDown,
                            contentDescription = "Minimize Room",
                            tint = TextPrimary,
                            modifier = Modifier.size(28.dp)
                        )
                    }

                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = room.title,
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            color = TextPrimary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = "Vibe: ${room.ambientVibe.uppercase()} • ${room.speakers.size + room.listeners.size} in room",
                            style = MaterialTheme.typography.labelSmall,
                            color = BrandCyan
                        )
                    }

                    Button(
                        onClick = onLeave,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = ElevatedDark,
                            contentColor = AccentRed
                        ),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                        modifier = Modifier.testTag("leave_room_button")
                    ) {
                        Text("Leave", fontWeight = FontWeight.Bold)
                    }
                }

                // PK Battle Banner (if active)
                room.pkBattle?.let { pk ->
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = CardDark,
                        border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp)
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "⚡️ PK BATTLE",
                                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                    color = AccentAmber
                                )
                                Text(
                                    text = "${pk.timeLeftSeconds}s remaining",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = TextSecondary
                                )
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            // Score bar
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(8.dp)
                                    .clip(RoundedCornerShape(4.dp))
                            ) {
                                Box(
                                    modifier = Modifier
                                        .weight(pk.teamRedScore.toFloat())
                                        .fillMaxHeight()
                                        .background(AccentRed)
                                )
                                Box(
                                    modifier = Modifier
                                        .weight(pk.teamBlueScore.toFloat())
                                        .fillMaxHeight()
                                        .background(BrandCyan)
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(text = "${pk.teamRedUser}: ${pk.teamRedScore}", style = MaterialTheme.typography.labelSmall, color = AccentRed)
                                Text(text = "${pk.teamBlueUser}: ${pk.teamBlueScore}", style = MaterialTheme.typography.labelSmall, color = BrandCyan)
                            }
                        }
                    }
                }

                // 8-Seat Stage Grid (2 rows of 4)
                Text(
                    text = "SPEAKERS ON STAGE",
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold, letterSpacing = 1.sp),
                    color = TextMuted,
                    modifier = Modifier.padding(horizontal = 16.dp, top = 8.dp, bottom = 4.dp)
                )

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    for (i in 0..3) {
                        val speaker = room.speakers.find { it.seatNumber == i }
                        SpeakerSlot(
                            speaker = speaker,
                            pulseSize = pulseSize,
                            onTip = { onTipHost(20) }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    for (i in 4..7) {
                        val speaker = room.speakers.find { it.seatNumber == i }
                        SpeakerSlot(
                            speaker = speaker,
                            pulseSize = pulseSize,
                            onTip = { onTipHost(20) }
                        )
                    }
                }

                HorizontalDivider(
                    color = BorderDark,
                    thickness = 0.5.dp,
                    modifier = Modifier.padding(vertical = 10.dp)
                )

                // In-Room Live Chat Scroll
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(messages) { msg ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(CardDark.copy(alpha = 0.6f))
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = msg.username,
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                color = BrandCyan
                            )
                            Text(
                                text = msg.text,
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextPrimary
                            )
                        }
                    }
                }

                // Quick Reactions Row
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val emojis = listOf("🔥", "❤️", "👏", "☕️", "🚀", "💎")
                    emojis.forEach { emoji ->
                        Surface(
                            onClick = { onSendReaction(emoji) },
                            shape = CircleShape,
                            color = CardDark,
                            border = androidx.compose.foundation.BorderStroke(0.5.dp, BorderDark),
                            modifier = Modifier.size(38.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(text = emoji, fontSize = 18.sp)
                            }
                        }
                    }
                }

                // Bottom Stage Bar: Mute Toggle, Chat Input, Tip, Raise Hand
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Mic Mute / Unmute
                    FilledIconButton(
                        onClick = onMuteToggle,
                        colors = IconButtonDefaults.filledIconButtonColors(
                            containerColor = if (isMuted) ElevatedDark else BrandCyan
                        ),
                        modifier = Modifier
                            .size(44.dp)
                            .testTag("room_mute_button")
                    ) {
                        Icon(
                            imageVector = if (isMuted) Icons.Default.MicOff else Icons.Default.Mic,
                            contentDescription = "Mute Toggle",
                            tint = if (isMuted) AccentRed else Color.Black
                        )
                    }

                    // Raise Hand Button
                    FilledIconButton(
                        onClick = { hasRaisedHand = !hasRaisedHand },
                        colors = IconButtonDefaults.filledIconButtonColors(
                            containerColor = if (hasRaisedHand) AccentAmber else ElevatedDark
                        ),
                        modifier = Modifier.size(44.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.PanTool,
                            contentDescription = "Raise Hand",
                            tint = if (hasRaisedHand) Color.Black else TextPrimary
                        )
                    }

                    // Message input field
                    OutlinedTextField(
                        value = messageInput,
                        onValueChange = { messageInput = it },
                        placeholder = { Text("Chat in room...", color = TextMuted, fontSize = 13.sp) },
                        singleLine = true,
                        shape = RoundedCornerShape(20.dp),
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = CardDark,
                            unfocusedContainerColor = CardDark,
                            focusedIndicatorColor = BrandCyan,
                            unfocusedIndicatorColor = BorderDark,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary
                        ),
                        trailingIcon = {
                            if (messageInput.isNotBlank()) {
                                IconButton(
                                    onClick = {
                                        onSendMessage(messageInput)
                                        messageInput = ""
                                    }
                                ) {
                                    Icon(Icons.Default.Send, contentDescription = "Send", tint = BrandCyan)
                                }
                            }
                        },
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp)
                    )

                    // Tip Gift Button
                    FilledIconButton(
                        onClick = { onTipHost(20) },
                        colors = IconButtonDefaults.filledIconButtonColors(
                            containerColor = AccentAmber
                        ),
                        modifier = Modifier
                            .size(44.dp)
                            .testTag("room_tip_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.MonetizationOn,
                            contentDescription = "Tip 20 Coins",
                            tint = Color.Black
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SpeakerSlot(
    speaker: RoomParticipant?,
    pulseSize: Float,
    onTip: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .width(76.dp)
            .clickable(enabled = speaker != null) { onTip() }
    ) {
        if (speaker != null) {
            Box(
                modifier = Modifier.size(62.dp),
                contentAlignment = Alignment.Center
            ) {
                if (speaker.isSpeaking) {
                    Box(
                        modifier = Modifier
                            .size((62 * pulseSize).dp)
                            .clip(CircleShape)
                            .background(BrandCyan.copy(alpha = 0.35f))
                    )
                }
                AsyncImage(
                    model = speaker.avatar.ifBlank { "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80" },
                    contentDescription = speaker.displayName,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(54.dp)
                        .clip(CircleShape)
                        .border(if (speaker.isSpeaking) 2.dp else 1.dp, if (speaker.isSpeaking) BrandCyan else BorderDark, CircleShape)
                )
                if (speaker.isHost) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .size(18.dp)
                            .clip(CircleShape)
                            .background(AccentAmber),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("👑", fontSize = 10.sp)
                    }
                }
            }
            Spacer(modifier = Modifier.height(3.dp))
            Text(
                text = speaker.displayName,
                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                color = TextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        } else {
            // Empty Stage Seat
            Box(
                modifier = Modifier
                    .size(54.dp)
                    .clip(CircleShape)
                    .background(CardDark)
                    .border(1.dp, BorderDark, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = "Empty Seat",
                    tint = TextMuted,
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(modifier = Modifier.height(3.dp))
            Text(
                text = "Open Seat",
                style = MaterialTheme.typography.labelSmall,
                color = TextMuted
            )
        }
    }
}
