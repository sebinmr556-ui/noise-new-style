package com.example.noise.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Place
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
import com.example.noise.ui.theme.*

@Composable
fun UploadScreen(
    onPostCreated: (String, String, String) -> Unit,
    onStartVoiceRoom: () -> Unit,
    modifier: Modifier = Modifier
) {
    var caption by remember { mutableStateOf("") }
    var location by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf("Normal") }

    val presetImages = listOf(
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80"
    )
    var selectedImage by remember { mutableStateOf(presetImages[0]) }

    val filters = listOf("Normal", "Clarendon", "Juno", "Vintage", "B&W", "Warm", "Cyber")

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(BackgroundBlack)
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(bottom = 100.dp)
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "New Post",
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                color = TextPrimary
            )

            Button(
                onClick = {
                    onPostCreated(selectedImage, caption, selectedFilter)
                },
                enabled = caption.isNotBlank() || selectedImage.isNotBlank(),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = BrandCyan,
                    contentColor = Color.Black
                ),
                modifier = Modifier.testTag("publish_post_button")
            ) {
                Text("Share", fontWeight = FontWeight.Bold)
            }
        }

        // Selected Image Preview
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(280.dp)
                .padding(horizontal = 16.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(CardDark),
            contentAlignment = Alignment.Center
        ) {
            AsyncImage(
                model = selectedImage,
                contentDescription = "Selected preview",
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Preset Images Selector
        Text(
            text = "Choose Photo",
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            color = TextPrimary,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(presetImages) { img ->
                val isSelected = selectedImage == img
                Box(
                    modifier = Modifier
                        .size(68.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .border(if (isSelected) 2.5.dp else 1.dp, if (isSelected) BrandCyan else BorderDark, RoundedCornerShape(12.dp))
                        .clickable { selectedImage = img }
                ) {
                    AsyncImage(
                        model = img,
                        contentDescription = "Option",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Filters Selector
        Text(
            text = "Photo Filter",
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            color = TextPrimary,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(filters) { f ->
                val isSelected = selectedFilter == f
                Surface(
                    onClick = { selectedFilter = f },
                    shape = RoundedCornerShape(16.dp),
                    color = if (isSelected) BrandIndigo else CardDark,
                    border = androidx.compose.foundation.BorderStroke(1.dp, if (isSelected) BrandCyan else BorderDark),
                    modifier = Modifier.testTag("filter_$f")
                ) {
                    Text(
                        text = f,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                        ),
                        color = if (isSelected) Color.White else TextSecondary,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Caption Field
        OutlinedTextField(
            value = caption,
            onValueChange = { caption = it },
            placeholder = { Text("Write a caption...", color = TextMuted) },
            shape = RoundedCornerShape(14.dp),
            colors = TextFieldDefaults.colors(
                focusedContainerColor = CardDark,
                unfocusedContainerColor = CardDark,
                focusedIndicatorColor = BrandCyan,
                unfocusedIndicatorColor = BorderDark,
                focusedTextColor = TextPrimary,
                unfocusedTextColor = TextPrimary
            ),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .height(110.dp)
                .testTag("post_caption_input")
        )

        Spacer(modifier = Modifier.height(10.dp))

        // Location Field
        OutlinedTextField(
            value = location,
            onValueChange = { location = it },
            placeholder = { Text("Add location...", color = TextMuted) },
            leadingIcon = {
                Icon(Icons.Default.Place, contentDescription = "Location", tint = TextSecondary)
            },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
            colors = TextFieldDefaults.colors(
                focusedContainerColor = CardDark,
                unfocusedContainerColor = CardDark,
                focusedIndicatorColor = BrandCyan,
                unfocusedIndicatorColor = BorderDark,
                focusedTextColor = TextPrimary,
                unfocusedTextColor = TextPrimary
            ),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .testTag("post_location_input")
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Secondary Action: Host Voice Room
        Surface(
            onClick = onStartVoiceRoom,
            shape = RoundedCornerShape(14.dp),
            color = CardDark,
            border = androidx.compose.foundation.BorderStroke(1.dp, BrandCyan.copy(alpha = 0.4f)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .testTag("upload_to_live_room_button")
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(BrandGradient),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Mic,
                        contentDescription = "Mic",
                        tint = Color.Black,
                        modifier = Modifier.size(22.dp)
                    )
                }
                Column {
                    Text(
                        text = "Go Live Instead?",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = TextPrimary
                    )
                    Text(
                        text = "Start a Live Voice Room with friends and followers",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary
                    )
                }
            }
        }
    }
}
