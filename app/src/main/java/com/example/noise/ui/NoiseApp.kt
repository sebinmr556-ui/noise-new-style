package com.example.noise.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.noise.model.NavTab
import com.example.noise.ui.components.*
import com.example.noise.ui.dialogs.*
import com.example.noise.ui.screens.*
import com.example.noise.ui.theme.BackgroundBlack
import com.example.noise.viewmodel.NoiseViewModel

@Composable
fun NoiseApp(
    viewModel: NoiseViewModel = viewModel()
) {
    val currentUser by viewModel.currentUser.collectAsState()
    val posts by viewModel.posts.collectAsState()
    val stories by viewModel.stories.collectAsState()
    val voiceRooms by viewModel.voiceRooms.collectAsState()
    val reels by viewModel.reels.collectAsState()
    val directMessages by viewModel.directMessages.collectAsState()
    val notifications by viewModel.notifications.collectAsState()
    val activeRoom by viewModel.activeRoom.collectAsState()
    val isMuted by viewModel.isMuted.collectAsState()
    val roomMessages by viewModel.roomMessages.collectAsState()

    val currentTab by viewModel.currentTab.collectAsState()
    val isRoomModalOpen by viewModel.isRoomModalOpen.collectAsState()
    val isCreateRoomOpen by viewModel.isCreateRoomOpen.collectAsState()
    val isDirectMessagesOpen by viewModel.isDirectMessagesOpen.collectAsState()
    val isNotificationsOpen by viewModel.isNotificationsOpen.collectAsState()
    val isCoinsOpen by viewModel.isCoinsOpen.collectAsState()
    val selectedPostComments by viewModel.selectedPostComments.collectAsState()
    val selectedStoryIndex by viewModel.selectedStoryIndex.collectAsState()

    // BackHandler: when on secondary tab, back navigates to HOME
    if (currentTab != NavTab.HOME) {
        BackHandler {
            viewModel.setTab(NavTab.HOME)
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize().background(BackgroundBlack),
        topBar = {
            if (currentTab == NavTab.HOME) {
                NoiseTopBar(
                    coinsBalance = currentUser.coinsBalance,
                    onCoinsClick = { viewModel.openCoins() },
                    onDMsClick = { viewModel.openDirectMessages() },
                    onNotificationsClick = { viewModel.openNotifications() }
                )
            }
        },
        bottomBar = {
            Column {
                // Mini Player if room is active and not opened
                if (activeRoom != null && !isRoomModalOpen) {
                    VoiceRoomMiniPlayer(
                        room = activeRoom!!,
                        isMuted = isMuted,
                        onMuteToggle = { viewModel.toggleMute() },
                        onMaximize = { viewModel.maximizeRoom() },
                        onLeave = { viewModel.leaveRoom() }
                    )
                }

                NoiseBottomBar(
                    currentTab = currentTab,
                    onTabSelected = { tab -> viewModel.setTab(tab) }
                )
            }
        },
        contentWindowInsets = WindowInsets(0, 0, 0, 0)
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (currentTab) {
                NavTab.HOME -> HomeScreen(
                    currentUser = currentUser,
                    stories = stories,
                    voiceRooms = voiceRooms,
                    posts = posts,
                    onStoryClick = { index -> viewModel.openStory(index) },
                    onStartRoomClick = { viewModel.openCreateRoom() },
                    onRoomClick = { room -> viewModel.joinRoom(room) },
                    onLikePost = { postId -> viewModel.toggleLike(postId) },
                    onCommentPost = { post -> viewModel.openComments(post) },
                    onAuthorClick = { username -> viewModel.toggleFollow(username) }
                )
                NavTab.EXPLORE -> ExploreScreen(
                    followingUsers = currentUser.following,
                    onToggleFollow = { username -> viewModel.toggleFollow(username) },
                    onUserClick = { username -> viewModel.toggleFollow(username) }
                )
                NavTab.UPLOAD -> UploadScreen(
                    onPostCreated = { img, caption, filter ->
                        viewModel.createPost(img, caption, filter)
                    },
                    onStartVoiceRoom = {
                        viewModel.openCreateRoom()
                    }
                )
                NavTab.REELS -> ReelsScreen(
                    reels = reels,
                    onAuthorClick = { username -> viewModel.toggleFollow(username) }
                )
                NavTab.PROFILE -> ProfileScreen(
                    currentUser = currentUser,
                    userPosts = posts.filter { it.username == currentUser.username || it.uid == currentUser.uid },
                    onOpenCoins = { viewModel.openCoins() }
                )
            }
        }
    }

    // Live Voice Room Modal Sheet
    if (isRoomModalOpen && activeRoom != null) {
        VoiceRoomDialog(
            room = activeRoom!!,
            isMuted = isMuted,
            messages = roomMessages,
            coinsBalance = currentUser.coinsBalance,
            onMuteToggle = { viewModel.toggleMute() },
            onMinimize = { viewModel.minimizeRoom() },
            onLeave = { viewModel.leaveRoom() },
            onSendMessage = { text -> viewModel.sendRoomMessage(text) },
            onSendReaction = { emoji -> viewModel.sendReaction(emoji) },
            onTipHost = { amount -> viewModel.tipSpeaker(amount) }
        )
    }

    // Create Room Dialog
    if (isCreateRoomOpen) {
        CreateVoiceRoomDialog(
            onDismiss = { viewModel.closeCreateRoom() },
            onCreateRoom = { title, topic, tags, vibe ->
                viewModel.createAndJoinRoom(title, topic, tags, vibe)
            }
        )
    }

    // Direct Messages Modal
    if (isDirectMessagesOpen) {
        DirectMessagesDialog(
            contacts = directMessages,
            onDismiss = { viewModel.closeDirectMessages() }
        )
    }

    // Post Comments Sheet
    selectedPostComments?.let { post ->
        CommentsSheet(
            post = post,
            onDismiss = { viewModel.closeComments() },
            onAddComment = { text -> viewModel.addComment(post.id, text) }
        )
    }

    // Story Viewer Modal
    selectedStoryIndex?.let { index ->
        StoryViewerDialog(
            stories = stories,
            initialIndex = index,
            onDismiss = { viewModel.closeStory() }
        )
    }

    // Notifications Dialog
    if (isNotificationsOpen) {
        NotificationsDialog(
            notifications = notifications,
            onDismiss = { viewModel.closeNotifications() }
        )
    }

    // Coins Store Dialog
    if (isCoinsOpen) {
        CoinsDialog(
            balance = currentUser.coinsBalance,
            onBuyCoins = { amount -> viewModel.buyCoins(amount) },
            onDismiss = { viewModel.closeCoins() }
        )
    }
}
