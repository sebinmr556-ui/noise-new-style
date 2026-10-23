package com.example.noise.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.noise.model.Post
import com.example.noise.ui.theme.*
import kotlinx.coroutines.delay

@Composable
fun PostCard(
    post: Post,
    currentUserId: String,
    onLikeClick: () -> Unit,
    onCommentClick: () -> Unit,
    onAuthorClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isLiked = post.likedBy.contains(currentUserId)
    var isSaved by remember { mutableStateOf(false) }
    var showHeartPop by remember { mutableStateOf(false) }

    LaunchedEffect(showHeartPop) {
        if (showHeartPop) {
            delay(800)
            showHeartPop = false
        }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp)
            .testTag("post_card_${post.id}")
    ) {
        // Author Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier
                    .clickable { onAuthorClick() }
                    .testTag("post_author_${post.id}")
            ) {
                AsyncImage(
                    model = post.avatar,
                    contentDescription = post.username,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .border(1.dp, BorderDark, CircleShape)
                )
                Column {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = post.username,
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            color = TextPrimary
                        )
                        if (post.isVerified) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = "Verified",
                                tint = BrandCyan,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                    if (!post.location.isNullOrBlank()) {
                        Text(
                            text = post.location,
                            style = MaterialTheme.typography.labelSmall,
                            color = TextMuted
                        )
                    }
                }
            }

            IconButton(
                onClick = {},
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.MoreVert,
                    contentDescription = "Options",
                    tint = TextSecondary
                )
            }
        }

        // Image with Double-Tap to Like
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .background(CardDark)
                .pointerInput(Unit) {
                    detectTapGestures(
                        onDoubleTap = {
                            if (!isLiked) {
                                onLikeClick()
                            }
                            showHeartPop = true
                        }
                    )
                },
            contentAlignment = Alignment.Center
        ) {
            AsyncImage(
                model = post.image,
                contentDescription = post.caption,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            // Animated Heart Pop
            AnimatedVisibility(
                visible = showHeartPop,
                enter = scaleIn(spring(dampingRatio = Spring.DampingRatioMediumBouncy)),
                exit = scaleOut()
            ) {
                Icon(
                    imageVector = Icons.Default.Favorite,
                    contentDescription = "Liked",
                    tint = AccentRed,
                    modifier = Modifier.size(80.dp)
                )
            }
        }

        // Action Buttons Row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                // Like Button
                IconButton(
                    onClick = {
                        onLikeClick()
                        if (!isLiked) showHeartPop = true
                    },
                    modifier = Modifier.testTag("like_button_${post.id}")
                ) {
                    Icon(
                        imageVector = if (isLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                        contentDescription = "Like",
                        tint = if (isLiked) AccentRed else TextPrimary
                    )
                }

                // Comment Button
                IconButton(
                    onClick = onCommentClick,
                    modifier = Modifier.testTag("comment_button_${post.id}")
                ) {
                    Icon(
                        imageVector = Icons.Outlined.ChatBubbleOutline,
                        contentDescription = "Comment",
                        tint = TextPrimary
                    )
                }

                // Share Button
                IconButton(onClick = {}) {
                    Icon(
                        imageVector = Icons.Default.Send,
                        contentDescription = "Share",
                        tint = TextPrimary
                    )
                }
            }

            // Save / Bookmark
            IconButton(
                onClick = { isSaved = !isSaved },
                modifier = Modifier.testTag("bookmark_button_${post.id}")
            ) {
                Icon(
                    imageVector = if (isSaved) Icons.Default.Bookmark else Icons.Default.BookmarkBorder,
                    contentDescription = "Save",
                    tint = if (isSaved) BrandCyan else TextPrimary
                )
            }
        }

        // Likes Count
        if (post.likes > 0) {
            Text(
                text = "${post.likes} likes",
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                color = TextPrimary,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp)
            )
        }

        // Caption
        if (post.caption.isNotBlank()) {
            val annotatedCaption = buildAnnotatedString {
                withStyle(style = SpanStyle(fontWeight = FontWeight.Bold, color = TextPrimary)) {
                    append(post.username)
                    append("  ")
                }
                append(post.caption)
            }
            Text(
                text = annotatedCaption,
                style = MaterialTheme.typography.bodyMedium,
                color = TextPrimary,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp)
            )
        }

        // Comments Count / View comments button
        if (post.comments.isNotEmpty()) {
            Text(
                text = "View all ${post.comments.size} comments",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
                modifier = Modifier
                    .clickable { onCommentClick() }
                    .padding(horizontal = 16.dp, vertical = 2.dp)
            )
        }

        // Timestamp
        Text(
            text = "2 hours ago",
            style = MaterialTheme.typography.labelSmall,
            color = TextMuted,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp)
        )
    }
}
