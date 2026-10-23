package com.example.noise.ui.dialogs

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.example.noise.model.DirectMessageContact
import com.example.noise.model.DirectMessageItem
import com.example.noise.ui.theme.*

@Composable
fun DirectMessagesDialog(
    contacts: List<DirectMessageContact>,
    onDismiss: () -> Unit
) {
    var selectedContact by remember { mutableStateOf<DirectMessageContact?>(null) }
    var messages by remember {
        mutableStateOf(
            listOf(
                DirectMessageItem("1", "maya_beats", "maya_beats", "Hey! Ready for tonight's voice lounge? ☕️", "15m ago", isMe = false),
                DirectMessageItem("2", "user-me", "alex_rivera", "Absolutely, got some new synth clips queued up!", "12m ago", isMe = true),
                DirectMessageItem("3", "maya_beats", "maya_beats", "See you on the live stage tonight! 🎧", "10m ago", isMe = false)
            )
        )
    }
    var inputText by remember { mutableStateOf("") }

    Dialog(
        onDismissRequest = onDismiss,
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
                // Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        if (selectedContact != null) {
                            IconButton(onClick = { selectedContact = null }) {
                                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = TextPrimary)
                            }
                            AsyncImage(
                                model = selectedContact!!.avatar,
                                contentDescription = selectedContact!!.name,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(34.dp)
                                    .clip(CircleShape)
                            )
                            Text(
                                text = selectedContact!!.name,
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                color = TextPrimary
                            )
                        } else {
                            Text(
                                text = "Direct Messages",
                                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                                color = TextPrimary
                            )
                        }
                    }

                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = TextSecondary)
                    }
                }

                HorizontalDivider(color = BorderDark, thickness = 0.5.dp)

                if (selectedContact == null) {
                    // Contact List
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(contacts) { contact ->
                            Surface(
                                onClick = { selectedContact = contact },
                                shape = RoundedCornerShape(14.dp),
                                color = CardDark,
                                border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("dm_contact_${contact.id}")
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Box {
                                        AsyncImage(
                                            model = contact.avatar,
                                            contentDescription = contact.name,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier
                                                .size(46.dp)
                                                .clip(CircleShape)
                                        )
                                        if (contact.online) {
                                            Box(
                                                modifier = Modifier
                                                    .align(Alignment.BottomEnd)
                                                    .size(12.dp)
                                                    .clip(CircleShape)
                                                    .background(AccentGreen)
                                                    .border(2.dp, CardDark, CircleShape)
                                            )
                                        }
                                    }

                                    Column(modifier = Modifier.weight(1f)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(
                                                text = contact.name,
                                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                                color = TextPrimary
                                            )
                                            Text(
                                                text = contact.time,
                                                style = MaterialTheme.typography.labelSmall,
                                                color = TextMuted
                                            )
                                        }
                                        Text(
                                            text = contact.lastMessage,
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = if (contact.unread) TextPrimary else TextSecondary,
                                            fontWeight = if (contact.unread) FontWeight.Bold else FontWeight.Normal,
                                            maxLines = 1
                                        )
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // Chat Conversation
                    LazyColumn(
                        modifier = Modifier
                            .weight(1f)
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(messages) { msg ->
                            val isMe = msg.isMe
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = if (isMe) Arrangement.End else Arrangement.Start
                            ) {
                                Box(
                                    modifier = Modifier
                                        .widthIn(max = 280.dp)
                                        .clip(RoundedCornerShape(16.dp))
                                        .background(if (isMe) BrandCyan else CardDark)
                                        .padding(horizontal = 14.dp, vertical = 10.dp)
                                ) {
                                    Text(
                                        text = msg.text,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = if (isMe) Color.Black else TextPrimary
                                    )
                                }
                            }
                        }
                    }

                    // Input Bar
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = inputText,
                            onValueChange = { inputText = it },
                            placeholder = { Text("Message...", color = TextMuted) },
                            singleLine = true,
                            shape = RoundedCornerShape(24.dp),
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = CardDark,
                                unfocusedContainerColor = CardDark,
                                focusedIndicatorColor = BrandCyan,
                                unfocusedIndicatorColor = BorderDark,
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary
                            ),
                            modifier = Modifier.weight(1f)
                        )

                        FilledIconButton(
                            onClick = {
                                if (inputText.isNotBlank()) {
                                    messages = messages + DirectMessageItem(
                                        id = "${System.currentTimeMillis()}",
                                        senderId = "user-me",
                                        senderUsername = "alex_rivera",
                                        text = inputText.trim(),
                                        time = "Just now",
                                        isMe = true
                                    )
                                    inputText = ""
                                }
                            },
                            colors = IconButtonDefaults.filledIconButtonColors(containerColor = BrandCyan)
                        ) {
                            Icon(Icons.Default.Send, contentDescription = "Send", tint = Color.Black)
                        }
                    }
                }
            }
        }
    }
}
