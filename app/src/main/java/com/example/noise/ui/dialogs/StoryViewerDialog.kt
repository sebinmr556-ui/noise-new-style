package com.example.noise.ui.dialogs

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.example.noise.model.Story
import com.example.noise.ui.theme.*

@Composable
fun StoryViewerDialog(
    stories: List<Story>,
    initialIndex: Int,
    onDismiss: () -> Unit
) {
    var currentIndex by remember { mutableIntStateOf(initialIndex) }
    val currentStory = stories.getOrNull(currentIndex) ?: run {
        onDismiss()
        return
    }

    val progress = remember { Animatable(0f) }

    LaunchedEffect(currentIndex) {
        progress.snapTo(0f)
        progress.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 5000, easing = LinearEasing)
        )
        if (currentIndex < stories.size - 1) {
            currentIndex++
        } else {
            onDismiss()
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black)
                .pointerInput(currentIndex) {
                    detectTapGestures(
                        onTap = { offset ->
                            val screenWidth = size.width
                            if (offset.x < screenWidth * 0.35f) {
                                if (currentIndex > 0) currentIndex-- else onDismiss()
                            } else {
                                if (currentIndex < stories.size - 1) currentIndex++ else onDismiss()
                            }
                        }
                    )
                }
        ) {
            // Background Story Media
            AsyncImage(
                model = currentStory.mediaUrl,
                contentDescription = currentStory.caption,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            // Top Gradient & Info Overlay
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Black.copy(alpha = 0.7f), Color.Transparent)
                        )
                    )
                    .padding(16.dp)
            ) {
                // Progress Bars
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    stories.forEachIndexed { i, _ ->
                        val barProgress = when {
                            i < currentIndex -> 1f
                            i == currentIndex -> progress.value
                            else -> 0f
                        }
                        LinearProgressIndicator(
                            progress = { barProgress },
                            color = Color.White,
                            trackColor = Color.White.copy(alpha = 0.3f),
                            modifier = Modifier
                                .weight(1f)
                                .height(2.5.dp)
                                .clip(RoundedCornerShape(2.dp))
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Author Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        AsyncImage(
                            model = currentStory.avatar,
                            contentDescription = currentStory.username,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .border(1.dp, Color.White, CircleShape)
                        )
                        Column {
                            Text(
                                text = currentStory.username,
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                color = Color.White
                            )
                            Text(
                                text = currentStory.timestamp,
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White.copy(alpha = 0.7f)
                            )
                        }
                    }

                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.testTag("close_story_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close Story",
                            tint = Color.White
                        )
                    }
                }
            }

            // Caption overlay
            currentStory.caption?.let { cap ->
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 80.dp, start = 20.dp, end = 20.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color.Black.copy(alpha = 0.6f))
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = cap,
                        style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
                        color = Color.White
                    )
                }
            }

            // Bottom Story Reply Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .navigationBarsPadding()
                    .padding(12.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = "",
                    onValueChange = {},
                    placeholder = { Text("Send message...", color = Color.White.copy(alpha = 0.7f), fontSize = 13.sp) },
                    shape = RoundedCornerShape(24.dp),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Black.copy(alpha = 0.5f),
                        unfocusedContainerColor = Color.Black.copy(alpha = 0.5f),
                        focusedIndicatorColor = Color.White,
                        unfocusedIndicatorColor = Color.White.copy(alpha = 0.5f)
                    ),
                    modifier = Modifier.weight(1f)
                )

                IconButton(onClick = {}) {
                    Icon(
                        imageVector = Icons.Default.FavoriteBorder,
                        contentDescription = "Like Story",
                        tint = Color.White
                    )
                }
            }
        }
    }
}
