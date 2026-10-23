package com.example.noise.ui.dialogs

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.noise.ui.theme.*

@Composable
fun CreateVoiceRoomDialog(
    onDismiss: () -> Unit,
    onCreateRoom: (title: String, topic: String, tags: List<String>, vibe: String) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var topic by remember { mutableStateOf("") }
    var selectedVibe by remember { mutableStateOf("lofi") }

    val vibes = listOf("lofi" to "☕️ Lofi", "synth" to "⚡️ Synth", "rain" to "🌧️ Rain", "cafe" to "🥐 Cafe", "none" to "🔇 None")

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = SurfaceDark,
            border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark),
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Host a Voice Room",
                        style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                        color = TextPrimary
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = TextSecondary)
                    }
                }

                // Title Input
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Room Title") },
                    placeholder = { Text("e.g. Late Night Synth Lounge 🌙") },
                    shape = RoundedCornerShape(14.dp),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = CardDark,
                        unfocusedContainerColor = CardDark,
                        focusedIndicatorColor = BrandCyan,
                        unfocusedIndicatorColor = BorderDark,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary
                    ),
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("create_room_title_input")
                )

                // Topic Input
                OutlinedTextField(
                    value = topic,
                    onValueChange = { topic = it },
                    label = { Text("Topic / Description") },
                    placeholder = { Text("What are we talking about?") },
                    shape = RoundedCornerShape(14.dp),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = CardDark,
                        unfocusedContainerColor = CardDark,
                        focusedIndicatorColor = BrandCyan,
                        unfocusedIndicatorColor = BorderDark,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                // Ambient Sound Vibe
                Text(
                    text = "Ambient Background Vibe",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = TextPrimary
                )

                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(vibes) { (key, label) ->
                        val isSelected = selectedVibe == key
                        Surface(
                            onClick = { selectedVibe = key },
                            shape = RoundedCornerShape(12.dp),
                            color = if (isSelected) BrandCyan else CardDark,
                            border = androidx.compose.foundation.BorderStroke(1.dp, if (isSelected) BrandCyan else BorderDark)
                        ) {
                            Text(
                                text = label,
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                ),
                                color = if (isSelected) Color.Black else TextPrimary,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                // Launch Button
                Button(
                    onClick = {
                        onCreateRoom(
                            title.ifBlank { "Live Hangout 🎙️" },
                            topic.ifBlank { "Open Discussion" },
                            listOf("Live", "Noise"),
                            selectedVibe
                        )
                    },
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = BrandCyan,
                        contentColor = Color.Black
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .testTag("start_live_now_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Mic,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Go Live Now",
                        style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Bold)
                    )
                }
            }
        }
    }
}
