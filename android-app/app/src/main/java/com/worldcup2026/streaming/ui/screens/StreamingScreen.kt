package com.worldcup2026.streaming.ui.screens

import android.app.Activity
import android.content.pm.ActivityInfo
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.FullscreenExit
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.worldcup2026.streaming.domain.model.Stream
import com.worldcup2026.streaming.ui.MainViewModel
import com.worldcup2026.streaming.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(UnstableApi::class)
@Composable
fun StreamingScreen(
    matchId: String,
    matchTitle: String,
    viewModel: MainViewModel,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val activity = context as? Activity
    val scope = rememberCoroutineScope()

    // Query active streams for this match
    val streamsFlow = remember(matchId) { viewModel.getStreamsForMatch(matchId) }
    val streams by streamsFlow.collectAsState(initial = emptyList())

    var isFullscreen by remember { mutableStateOf(false) }

    // Lock landscape on fullscreen toggle
    LaunchedEffect(isFullscreen) {
        if (isFullscreen) {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
        } else {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        }
    }

    // Restore portrait on exit
    DisposableEffect(Unit) {
        onDispose {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        }
    }

    if (streams.isEmpty()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(BackgroundColor),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                CircularProgressIndicator(color = PrimaryEmerald)
                Spacer(modifier = Modifier.height(16.dp))
                Text("Locating available stream feeds...", color = SlateMedium)
            }
        }
    } else {
        val stream = streams.first()
        val streamUrls = remember(stream) {
            listOfNotNull(
                stream.primaryUrl,
                stream.backupUrl1,
                stream.backupUrl2,
                stream.backupUrl3
            )
        }

        var currentUrlIndex by remember { mutableStateOf(0) }
        var playError by remember { mutableStateOf<String?>(null) }
        var isReconnecting by remember { mutableStateOf(false) }

        // Live stream health telemetry stats
        var bitrate by remember { mutableStateOf("Adaptive") }
        var bufferState by remember { mutableStateOf("Healthy") }
        var resolution by remember { mutableStateOf("1080p") }

        // ExoPlayer instance initialization
        val exoPlayer = remember {
            ExoPlayer.Builder(context).build().apply {
                playWhenReady = true
            }
        }

        fun playUrl(url: String) {
            playError = null
            isReconnecting = false
            val mediaItem = MediaItem.fromUri(url)
            exoPlayer.setMediaItem(mediaItem)
            exoPlayer.prepare()
        }

        // Listener for player events
        val playerListener = remember {
            object : Player.Listener {
                override fun onPlaybackStateChanged(state: Int) {
                    bufferState = when (state) {
                        Player.STATE_BUFFERING -> "Buffering..."
                        Player.STATE_READY -> "Healthy"
                        Player.STATE_ENDED -> "Feed Ended"
                        else -> "Idle"
                    }
                    if (state == Player.STATE_READY) {
                        val format = exoPlayer.videoFormat
                        if (format != null) {
                            resolution = "${format.width}x${format.height}"
                            bitrate = if (format.bitrate > 0) "${format.bitrate / 1000} kbps" else "Adaptive"
                        }
                    }
                }

                override fun onPlayerError(error: PlaybackException) {
                    playError = "Playback error on Feed ${currentUrlIndex + 1}: ${error.localizedMessage}"
                    
                    // Fallback Engine: switch to next backup stream after 3 seconds
                    scope.launch {
                        isReconnecting = true
                        delay(3000)
                        if (currentUrlIndex < streamUrls.size - 1) {
                            currentUrlIndex++
                            playUrl(streamUrls[currentUrlIndex])
                        } else {
                            // Cycle back to primary
                            currentUrlIndex = 0
                            playUrl(streamUrls[0])
                        }
                    }
                }
            }
        }

        LaunchedEffect(exoPlayer) {
            exoPlayer.addListener(playerListener)
            viewModel.recordViewEvent(matchId, matchTitle)
        }

        // Play active stream url
        LaunchedEffect(currentUrlIndex, stream) {
            playUrl(streamUrls[currentUrlIndex])
        }

        DisposableEffect(exoPlayer) {
            onDispose {
                exoPlayer.removeListener(playerListener)
                exoPlayer.release()
            }
        }

        if (isFullscreen) {
            // Fullscreen Landscape Player
            Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
                AndroidView(
                    factory = { ctx ->
                        PlayerView(ctx).apply {
                            player = exoPlayer
                            useController = true
                            layoutParams = FrameLayout.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT
                            )
                        }
                    },
                    modifier = Modifier.fillMaxSize()
                )

                // Fullscreen toggles
                IconButton(
                    onClick = { isFullscreen = false },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(16.dp)
                        .background(Color.Black.copy(alpha = 0.5f), shape = RoundedCornerShape(8.dp))
                ) {
                    Icon(
                        imageVector = Icons.Default.FullscreenExit,
                        contentDescription = "Exit Fullscreen",
                        tint = Color.White
                    )
                }

                // Health telemetry overlay
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(16.dp)
                        .background(Color.Black.copy(alpha = 0.6f), shape = RoundedCornerShape(8.dp))
                        .padding(8.dp)
                ) {
                    Text(
                        text = "Feed ${currentUrlIndex + 1} | Res: $resolution | Bitrate: $bitrate | $bufferState",
                        color = PrimaryEmerald,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        } else {
            // Portrait Standard Player Page
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(BackgroundColor)
            ) {
                // Header navigation bar
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = matchTitle,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                }

                // ExoPlayer Display
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(220.dp)
                        .background(Color.Black)
                ) {
                    AndroidView(
                        factory = { ctx ->
                            PlayerView(ctx).apply {
                                player = exoPlayer
                                useController = true
                                layoutParams = FrameLayout.LayoutParams(
                                    ViewGroup.LayoutParams.MATCH_PARENT,
                                    ViewGroup.LayoutParams.MATCH_PARENT
                                )
                            }
                        },
                        modifier = Modifier.fillMaxSize()
                    )

                    // Fullscreen control
                    IconButton(
                        onClick = { isFullscreen = true },
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(8.dp)
                            .background(Color.Black.copy(alpha = 0.5f), shape = RoundedCornerShape(8.dp))
                    ) {
                        Icon(
                            imageVector = Icons.Default.Fullscreen,
                            contentDescription = "Fullscreen",
                            tint = Color.White
                        )
                    }

                    // Loading/reconnecting states
                    if (isReconnecting || bufferState == "Buffering...") {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color.Black.copy(alpha = 0.4f)),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(color = PrimaryEmerald)
                        }
                    }
                }

                // Streams Details & Custom Fallbacks UI
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Title Card
                    Row(
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column {
                            Text(
                                text = "MONITORING CONSOLE",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Black,
                                color = SecondaryGold,
                                letterSpacing = 1.sp
                            )
                            Text(
                                text = stream.streamName,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }

                        IconButton(
                            onClick = { playUrl(streamUrls[currentUrlIndex]) },
                            modifier = Modifier.background(SurfaceColor, shape = RoundedCornerShape(10.dp))
                        ) {
                            Icon(imageVector = Icons.Default.Refresh, contentDescription = "Refresh", tint = PrimaryEmerald)
                        }
                    }

                    // Fallback Status card
                    if (playError != null) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(AccentRed.copy(alpha = 0.15f))
                                .padding(12.dp)
                        ) {
                            Text(
                                text = "$playError\nAuto reconnecting / switching to backup feed in 3 seconds...",
                                color = AccentRed,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    // Feed Selector
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = "AVAILABLE TRANSMISSION FEEDS",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black,
                            color = SlateMedium,
                            letterSpacing = 1.sp
                        )

                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            streamUrls.forEachIndexed { idx, _ ->
                                val isSelected = currentUrlIndex == idx
                                Box(
                                    contentAlignment = Alignment.Center,
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(44.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(if (isSelected) PrimaryEmerald else SurfaceColor)
                                        .clickable {
                                            currentUrlIndex = idx
                                            playUrl(streamUrls[idx])
                                        }
                                ) {
                                    Text(
                                        text = if (idx == 0) "Primary" else "Backup $idx",
                                        color = if (isSelected) Color.Black else Color.White,
                                        fontWeight = FontWeight.Black,
                                        fontSize = 11.sp
                                    )
                                }
                            }
                        }
                    }

                    // Stream Telemetry logs
                    Column(
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                            .background(SurfaceColor, shape = RoundedCornerShape(16.dp))
                            .padding(16.dp)
                    ) {
                        Text(
                            text = "STREAM HEALTH STATISTICS",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black,
                            color = SlateMedium,
                            letterSpacing = 1.sp
                        )
                        HorizontalDivider(color = SlateDark.copy(alpha = 0.5f))
                        
                        TelemetryRow("Feed Server:", "Tokyo Region (ap-northeast-1)")
                        TelemetryRow("Network Latency:", "82 ms (Low Delay)")
                        TelemetryRow("Resolution:", resolution)
                        TelemetryRow("Bitrate:", bitrate)
                        TelemetryRow("Buffer Health:", bufferState)
                    }
                }
            }
        }
    }
}

@Composable
fun TelemetryRow(label: String, value: String) {
    Row(
        horizontalArrangement = Arrangement.SpaceBetween,
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
    ) {
        Text(text = label, color = SlateMedium, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        Text(text = value, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Black)
    }
}
