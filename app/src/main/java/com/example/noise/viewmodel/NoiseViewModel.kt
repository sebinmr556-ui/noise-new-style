package com.example.noise.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.noise.data.NoiseRepository
import com.example.noise.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class FloatingReaction(
    val id: Long,
    val emoji: String,
    val startXFraction: Float
)

class NoiseViewModel(
    private val repository: NoiseRepository = NoiseRepository()
) : ViewModel() {

    val currentUser = repository.currentUser
    val posts = repository.posts
    val stories = repository.stories
    val voiceRooms = repository.voiceRooms
    val reels = repository.reels
    val directMessages = repository.directMessages
    val notifications = repository.notifications
    val activeRoom = repository.activeRoom
    val isMuted = repository.isMuted
    val roomMessages = repository.roomMessages

    private val _currentTab = MutableStateFlow(NavTab.HOME)
    val currentTab: StateFlow<NavTab> = _currentTab.asStateFlow()

    private val _isRoomModalOpen = MutableStateFlow(false)
    val isRoomModalOpen: StateFlow<Boolean> = _isRoomModalOpen.asStateFlow()

    private val _isCreateRoomOpen = MutableStateFlow(false)
    val isCreateRoomOpen: StateFlow<Boolean> = _isCreateRoomOpen.asStateFlow()

    private val _isDirectMessagesOpen = MutableStateFlow(false)
    val isDirectMessagesOpen: StateFlow<Boolean> = _isDirectMessagesOpen.asStateFlow()

    private val _isNotificationsOpen = MutableStateFlow(false)
    val isNotificationsOpen: StateFlow<Boolean> = _isNotificationsOpen.asStateFlow()

    private val _isCoinsOpen = MutableStateFlow(false)
    val isCoinsOpen: StateFlow<Boolean> = _isCoinsOpen.asStateFlow()

    private val _selectedPostComments = MutableStateFlow<Post?>(null)
    val selectedPostComments: StateFlow<Post?> = _selectedPostComments.asStateFlow()

    private val _selectedStoryIndex = MutableStateFlow<Int?>(null)
    val selectedStoryIndex: StateFlow<Int?> = _selectedStoryIndex.asStateFlow()

    private val _selectedUserProfile = MutableStateFlow<PublicUserProfile?>(null)
    val selectedUserProfile: StateFlow<PublicUserProfile?> = _selectedUserProfile.asStateFlow()

    private val _floatingReactions = MutableStateFlow<List<FloatingReaction>>(emptyList())
    val floatingReactions: StateFlow<List<FloatingReaction>> = _floatingReactions.asStateFlow()

    fun setTab(tab: NavTab) {
        _currentTab.value = tab
    }

    fun openStory(index: Int) {
        _selectedStoryIndex.value = index
    }

    fun closeStory() {
        _selectedStoryIndex.value = null
    }

    fun openComments(post: Post) {
        _selectedPostComments.value = post
    }

    fun closeComments() {
        _selectedPostComments.value = null
    }

    fun openUserProfile(profile: PublicUserProfile) {
        _selectedUserProfile.value = profile
    }

    fun closeUserProfile() {
        _selectedUserProfile.value = null
    }

    fun toggleLike(postId: String) {
        repository.toggleLikePost(postId)
    }

    fun addComment(postId: String, text: String) {
        repository.addComment(postId, text)
    }

    fun toggleFollow(username: String) {
        repository.toggleFollowUser(username)
    }

    fun createPost(imageUrl: String, caption: String, filter: String) {
        repository.createPost(imageUrl, caption, filter)
        _currentTab.value = NavTab.HOME
    }

    fun joinRoom(room: VoiceRoom) {
        repository.joinVoiceRoom(room)
        _isRoomModalOpen.value = true
    }

    fun minimizeRoom() {
        _isRoomModalOpen.value = false
    }

    fun maximizeRoom() {
        _isRoomModalOpen.value = true
    }

    fun leaveRoom() {
        repository.leaveVoiceRoom()
        _isRoomModalOpen.value = false
    }

    fun toggleMute() {
        repository.toggleMute()
    }

    fun sendRoomMessage(text: String) {
        repository.sendRoomMessage(text)
    }

    fun sendReaction(emoji: String) {
        val reaction = FloatingReaction(
            id = System.currentTimeMillis() + (0..1000).random(),
            emoji = emoji,
            startXFraction = (0.2f + Math.random().toFloat() * 0.6f)
        )
        _floatingReactions.value = _floatingReactions.value + reaction
    }

    fun openCreateRoom() {
        _isCreateRoomOpen.value = true
    }

    fun closeCreateRoom() {
        _isCreateRoomOpen.value = false
    }

    fun createAndJoinRoom(title: String, topic: String, tags: List<String>, vibe: String) {
        repository.createVoiceRoom(title, topic, tags, vibe)
        _isCreateRoomOpen.value = false
        _isRoomModalOpen.value = true
    }

    fun openDirectMessages() {
        _isDirectMessagesOpen.value = true
    }

    fun closeDirectMessages() {
        _isDirectMessagesOpen.value = false
    }

    fun openNotifications() {
        _isNotificationsOpen.value = true
    }

    fun closeNotifications() {
        _isNotificationsOpen.value = false
    }

    fun openCoins() {
        _isCoinsOpen.value = true
    }

    fun closeCoins() {
        _isCoinsOpen.value = false
    }

    fun buyCoins(amount: Int) {
        repository.addCoins(amount)
    }

    fun tipSpeaker(amount: Int) {
        repository.sendTip(amount)
    }
}
