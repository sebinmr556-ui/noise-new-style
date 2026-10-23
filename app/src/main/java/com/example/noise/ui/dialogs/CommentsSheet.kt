package com.example.noise.ui.dialogs

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
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
import coil.compose.AsyncImage
import com.example.noise.model.Post
import com.example.noise.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommentsSheet(
    post: Post,
    onDismiss: () -> Unit,
    onAddComment: (String) -> Unit
) {
    var commentText by remember { mutableStateOf("") }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = SurfaceDark,
        dragHandle = { BottomSheetDefaults.DragHandle(color = BorderDark) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.75f)
                .padding(bottom = 16.dp)
        ) {
            Text(
                text = "Comments",
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                color = TextPrimary,
                modifier = Modifier
                    .align(Alignment.CenterHorizontally)
                    .padding(bottom = 12.dp)
            )

            HorizontalDivider(color = BorderDark, thickness = 0.5.dp)

            // Comments List
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                if (post.comments.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 40.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "No comments yet. Be the first to share your thoughts!",
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextMuted
                            )
                        }
                    }
                } else {
                    items(post.comments) { comment ->
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.Top,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            AsyncImage(
                                model = comment.avatar.ifBlank { "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80" },
                                contentDescription = comment.username,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .border(1.dp, BorderDark, CircleShape)
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text(
                                        text = comment.username,
                                        style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                                        color = TextPrimary
                                    )
                                    if (comment.isVerified) {
                                        Icon(
                                            imageVector = Icons.Default.CheckCircle,
                                            contentDescription = "Verified",
                                            tint = BrandCyan,
                                            modifier = Modifier.size(13.dp)
                                        )
                                    }
                                    Text(
                                        text = "• ${comment.createdAt}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = TextMuted
                                    )
                                }
                                Text(
                                    text = comment.text,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = TextPrimary,
                                    modifier = Modifier.padding(top = 2.dp)
                                )
                            }
                        }
                    }
                }
            }

            // Input Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = commentText,
                    onValueChange = { commentText = it },
                    placeholder = { Text("Add a comment...", color = TextMuted) },
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
                    modifier = Modifier
                        .weight(1f)
                        .testTag("comment_input_field")
                )

                FilledIconButton(
                    onClick = {
                        if (commentText.isNotBlank()) {
                            onAddComment(commentText)
                            commentText = ""
                        }
                    },
                    colors = IconButtonDefaults.filledIconButtonColors(containerColor = BrandCyan),
                    modifier = Modifier.testTag("send_comment_button")
                ) {
                    Icon(Icons.Default.Send, contentDescription = "Send", tint = Color.Black)
                }
            }
        }
    }
}
