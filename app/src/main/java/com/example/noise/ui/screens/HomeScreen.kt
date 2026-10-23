package com.example.noise.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.noise.model.AppUser
import com.example.noise.model.Post
import com.example.noise.model.Story
import com.example.noise.model.VoiceRoom
import com.example.noise.ui.components.*
import com.example.noise.ui.theme.BackgroundBlack
import com.example.noise.ui.theme.BorderDark

@Composable
fun HomeScreen(
    currentUser: AppUser,
    stories: List<Story>,
    voiceRooms: List<VoiceRoom>,
    posts: List<Post>,
    onStoryClick: (Int) -> Unit,
    onStartRoomClick: () -> Unit,
    onRoomClick: (VoiceRoom) -> Unit,
    onLikePost: (String) -> Unit,
    onCommentPost: (Post) -> Unit,
    onAuthorClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(BackgroundBlack),
        contentPadding = PaddingValues(bottom = 90.dp)
    ) {
        // Stories Bar
        item {
            StoriesRow(
                currentUser = currentUser,
                stories = stories,
                onMyStoryClick = onStartRoomClick,
                onStoryClick = onStoryClick
            )
            HorizontalDivider(color = BorderDark, thickness = 0.5.dp)
        }

        // Live Voice Rooms Scroller
        item {
            LiveVoiceRoomsBar(
                rooms = voiceRooms,
                onStartRoomClick = onStartRoomClick,
                onRoomClick = onRoomClick
            )
            HorizontalDivider(color = BorderDark, thickness = 0.5.dp)
        }

        // Posts Feed
        items(posts, key = { it.id }) { post ->
            PostCard(
                post = post,
                currentUserId = currentUser.uid,
                onLikeClick = { onLikePost(post.id) },
                onCommentClick = { onCommentPost(post) },
                onAuthorClick = { onAuthorClick(post.username) }
            )
            HorizontalDivider(color = BorderDark, thickness = 0.5.dp)
        }
    }
}
