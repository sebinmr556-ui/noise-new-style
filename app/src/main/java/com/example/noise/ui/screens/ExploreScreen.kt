package com.example.noise.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.*
import androidx.compose.runtime.*
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
import com.example.noise.model.PublicUserProfile
import com.example.noise.ui.theme.*

data class ExploreItem(
    val id: String,
    val image: String,
    val tag: String,
    val likes: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExploreScreen(
    followingUsers: List<String>,
    onToggleFollow: (String) -> Unit,
    onUserClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("All") }

    val categories = listOf("All", "Voice Rooms", "Beats", "Photography", "Tech", "Art")

    val creators = listOf(
        PublicUserProfile("host-maya", "maya_9021", "maya_beats", "Maya Beats", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80", "Producer & Beatmaker 🎧", followersCount = 1420, followingCount = 230, isVerified = true),
        PublicUserProfile("host-dev", "alex_4082", "alex_codes", "Alex C.", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80", "Building apps & open-source 🚀", followersCount = 3890, followingCount = 412, isVerified = true),
        PublicUserProfile("user-kai", "kai_7719", "kai_dj", "Kai Music", "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80", "Electronic vibes & DJ sets ⚡️", followersCount = 2510, followingCount = 180, isVerified = true),
        PublicUserProfile("user-elena", "elena_5190", "elena_lens", "Elena Lens", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80", "Street & portrait photography 📸", followersCount = 5200, followingCount = 320, isVerified = true)
    )

    val explorePhotos = listOf(
        ExploreItem("e1", "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80", "Tech", "1.4k"),
        ExploreItem("e2", "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80", "Studio", "890"),
        ExploreItem("e3", "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80", "Tokyo", "2.1k"),
        ExploreItem("e4", "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80", "Music", "3.4k"),
        ExploreItem("e5", "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80", "Coding", "950"),
        ExploreItem("e6", "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80", "Concert", "4.2k")
    )

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(BackgroundBlack)
            .statusBarsPadding()
    ) {
        // Search Bar
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Search creators, rooms, tags...", color = TextMuted) },
            leadingIcon = {
                Icon(Icons.Default.Search, contentDescription = "Search", tint = TextSecondary)
            },
            shape = RoundedCornerShape(16.dp),
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
                .padding(horizontal = 16.dp, vertical = 8.dp)
                .testTag("explore_search_input")
        )

        // Filter Category Chips
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(bottom = 10.dp)
        ) {
            items(categories) { cat ->
                val isSelected = selectedCategory == cat
                Surface(
                    onClick = { selectedCategory = cat },
                    shape = RoundedCornerShape(20.dp),
                    color = if (isSelected) BrandCyan else CardDark,
                    border = androidx.compose.foundation.BorderStroke(1.dp, if (isSelected) BrandCyan else BorderDark),
                    modifier = Modifier.testTag("category_chip_$cat")
                ) {
                    Text(
                        text = cat,
                        style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
                        color = if (isSelected) Color.Black else TextPrimary,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
                    )
                }
            }
        }

        // Search Results or Staggered Explore Grid
        if (searchQuery.isNotBlank()) {
            val filteredCreators = creators.filter {
                it.username.contains(searchQuery, ignoreCase = true) ||
                it.displayName.contains(searchQuery, ignoreCase = true)
            }
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(filteredCreators) { creator ->
                    val isFollowed = followingUsers.contains(creator.username)
                    Surface(
                        onClick = { onUserClick(creator.username) },
                        shape = RoundedCornerShape(14.dp),
                        color = CardDark,
                        border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                AsyncImage(
                                    model = creator.avatar,
                                    contentDescription = creator.displayName,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .size(44.dp)
                                        .clip(CircleShape)
                                )
                                Column {
                                    Text(
                                        text = creator.displayName,
                                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                        color = TextPrimary
                                    )
                                    Text(
                                        text = "@${creator.username}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = TextSecondary
                                    )
                                }
                            }

                            Button(
                                onClick = { onToggleFollow(creator.username) },
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (isFollowed) ElevatedDark else BrandCyan,
                                    contentColor = if (isFollowed) TextPrimary else Color.Black
                                ),
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
                                modifier = Modifier.height(36.dp)
                            ) {
                                Text(
                                    text = if (isFollowed) "Following" else "Follow",
                                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold)
                                )
                            }
                        }
                    }
                }
            }
        } else {
            // Visual Explore Grid
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(start = 12.dp, end = 12.dp, bottom = 90.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(explorePhotos) { item ->
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(180.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(CardDark)
                    ) {
                        AsyncImage(
                            model = item.image,
                            contentDescription = item.tag,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                        // Gradient Overlay on bottom
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(60.dp)
                                .align(Alignment.BottomCenter)
                                .background(
                                    androidx.compose.ui.graphics.Brush.verticalGradient(
                                        listOf(Color.Transparent, Color.Black.copy(alpha = 0.8f))
                                    )
                                )
                        )
                        Row(
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .padding(10.dp),
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Favorite,
                                contentDescription = null,
                                tint = AccentRed,
                                modifier = Modifier.size(14.dp)
                            )
                            Text(
                                text = item.likes,
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                color = TextPrimary
                            )
                        }
                    }
                }
            }
        }
    }
}
