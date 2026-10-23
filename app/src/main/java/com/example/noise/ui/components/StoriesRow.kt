package com.example.noise.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.noise.model.AppUser
import com.example.noise.model.Story
import com.example.noise.ui.theme.*

@Composable
fun StoriesRow(
    currentUser: AppUser,
    stories: List<Story>,
    onMyStoryClick: () -> Unit,
    onStoryClick: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyRow(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // "Your Story" item
        item {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .width(72.dp)
                    .clickable { onMyStoryClick() }
                    .testTag("my_story_item")
            ) {
                Box(modifier = Modifier.size(68.dp)) {
                    AsyncImage(
                        model = currentUser.photoURL,
                        contentDescription = "Your Avatar",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(64.dp)
                            .align(Alignment.Center)
                            .clip(CircleShape)
                            .border(1.5.dp, BorderDark, CircleShape)
                    )
                    Box(
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .size(22.dp)
                            .clip(CircleShape)
                            .background(BrandCyan)
                            .border(2.dp, BackgroundBlack, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "Add Story",
                            tint = Color.Black,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Your story",
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp),
                    color = TextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        // Stories items
        itemsIndexed(stories) { index, story ->
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .width(72.dp)
                    .clickable { onStoryClick(index) }
                    .testTag("story_item_$index")
            ) {
                Box(
                    modifier = Modifier
                        .size(68.dp)
                        .clip(CircleShape)
                        .background(if (story.hasSeen) androidx.compose.ui.graphics.Brush.linearGradient(listOf(BorderDark, BorderDark)) else StoryGradient),
                    contentAlignment = Alignment.Center
                ) {
                    AsyncImage(
                        model = story.avatar,
                        contentDescription = story.username,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(62.dp)
                            .clip(CircleShape)
                            .border(2.dp, BackgroundBlack, CircleShape)
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = story.username,
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp),
                    color = TextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
