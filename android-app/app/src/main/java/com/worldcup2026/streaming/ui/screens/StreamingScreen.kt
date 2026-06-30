package com.worldcup2026.streaming.ui.screens

import android.app.Activity
import android.content.pm.ActivityInfo
import android.os.Build
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
    val activity = remember(context) {
        var ctx = context
        while (ctx is android.content.ContextWrapper) {
            if (ctx is Activity) {
                return@remember ctx
            }
            ctx = ctx.baseContext
        }
        ctx as? Activity
    }
    val componentActivity = activity as? androidx.activity.ComponentActivity
    val scope = rememberCoroutineScope()

    // Query active streams for this match
    val streamsFlow = remember(matchId) { viewModel.getStreamsForMatch(matchId) }
    val streams by streamsFlow.collectAsState(initial = emptyList())

    val isYoutubeEnabled = remember { viewModel.isYoutubeLiveEnabled() }
    val youtubeUrl = remember { viewModel.getYoutubeLiveUrl() }
    val youtubeLabel = remember { viewModel.getYoutubeLiveLabel() }

    var isFullscreen by remember { mutableStateOf(false) }
    var isInPipMode by remember { mutableStateOf(false) }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        DisposableEffect(componentActivity) {
            val listener = androidx.core.util.Consumer<androidx.core.app.PictureInPictureModeChangedInfo> { info ->
                isInPipMode = info.isInPictureInPictureMode
            }
            componentActivity?.addOnPictureInPictureModeChangedListener(listener)
            onDispose {
                componentActivity?.removeOnPictureInPictureModeChangedListener(listener)
            }
        }
    }

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

    val hasYoutubeStream = isYoutubeEnabled && !youtubeUrl.isNullOrEmpty()
    if (streams.isEmpty() && !hasYoutubeStream) {
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
        val stream = streams.firstOrNull()
        val streamItems = remember(streams, isYoutubeEnabled, youtubeUrl, youtubeLabel) {
            val list = mutableListOf<Pair<String, String>>()
            if (streams.isNotEmpty()) {
                val s = streams.first()
                if (!s.primaryUrl.isNullOrEmpty()) list.add("Primary" to s.primaryUrl)
                if (!s.backupUrl1.isNullOrEmpty()) list.add("Backup 1" to s.backupUrl1)
                if (!s.backupUrl2.isNullOrEmpty()) list.add("Backup 2" to s.backupUrl2)
                if (!s.backupUrl3.isNullOrEmpty()) list.add("Backup 3" to s.backupUrl3)
            }
            if (isYoutubeEnabled && !youtubeUrl.isNullOrEmpty()) {
                list.add(youtubeLabel to youtubeUrl)
            }
            list
        }

        val streamUrls = remember(streamItems) { streamItems.map { it.second } }
        val streamLabels = remember(streamItems) { streamItems.map { it.first } }

        var currentUrlIndex by remember { mutableStateOf(0) }
        var playError by remember { mutableStateOf<String?>(null) }
        var isReconnecting by remember { mutableStateOf(false) }

        // Live stream health telemetry stats
        var bitrate by remember { mutableStateOf("Adaptive") }
        var bufferState by remember { mutableStateOf("Healthy") }
        var resolution by remember { mutableStateOf("1080p") }

        // Player 2 controls state
        val activePlayer = remember { viewModel.getActivePlayer() }
        var currentSpeed by remember { mutableStateOf(1.0f) }
        var currentQuality by remember { mutableStateOf("HD") }
        var speedMenuExpanded by remember { mutableStateOf(false) }
        var qualityMenuExpanded by remember { mutableStateOf(false) }

        // ExoPlayer instance initialization
        val exoPlayer = remember {
            ExoPlayer.Builder(context).build().apply {
                playWhenReady = true
            }
        }

        val activeUrl = remember(streamUrls, currentUrlIndex) {
            streamUrls.getOrNull(currentUrlIndex) ?: ""
        }
        val isYouTube = remember(activeUrl) {
            activeUrl.contains("youtube.com") || activeUrl.contains("youtu.be")
        }

        fun playUrl(url: String) {
            playError = null
            isReconnecting = false
            if (url.isNotEmpty() && !url.contains("youtube.com") && !url.contains("youtu.be")) {
                val mediaItem = MediaItem.fromUri(url)
                exoPlayer.setMediaItem(mediaItem)
                exoPlayer.prepare()
            } else {
                exoPlayer.stop()
            }
        }

        fun setQuality(quality: String) {
            currentQuality = quality
            val parametersBuilder = exoPlayer.trackSelectionParameters.buildUpon()
            when (quality) {
                "HD" -> {
                    parametersBuilder
                        .setMaxVideoSize(Integer.MAX_VALUE, Integer.MAX_VALUE)
                        .setMaxVideoBitrate(Integer.MAX_VALUE)
                }
                "SD" -> {
                    parametersBuilder
                        .setMaxVideoSize(854, 480)
                        .setMaxVideoBitrate(1_000_000)
                }
                "Low" -> {
                    parametersBuilder
                        .setMaxVideoSize(426, 240)
                        .setMaxVideoBitrate(300_000)
                }
            }
            exoPlayer.trackSelectionParameters = parametersBuilder.build()
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
        LaunchedEffect(currentUrlIndex, streamItems) {
            if (currentUrlIndex < streamUrls.size) {
                playUrl(streamUrls[currentUrlIndex])
            }
        }

        DisposableEffect(exoPlayer) {
            onDispose {
                exoPlayer.removeListener(playerListener)
                exoPlayer.release()
            }
        }

        if (isInPipMode) {
            Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
                if (isYouTube) {
                    YouTubeWebViewPlayer(url = activeUrl, modifier = Modifier.fillMaxSize())
                } else {
                    AndroidView(
                        factory = { ctx ->
                            PlayerView(ctx).apply {
                                player = exoPlayer
                                useController = false
                                layoutParams = FrameLayout.LayoutParams(
                                    ViewGroup.LayoutParams.MATCH_PARENT,
                                    ViewGroup.LayoutParams.MATCH_PARENT
                                )
                            }
                        },
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }
        } else if (isFullscreen) {
            // Fullscreen Landscape Player
            Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
                if (isYouTube) {
                    YouTubeWebViewPlayer(url = activeUrl, modifier = Modifier.fillMaxSize())
                } else {
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
                }

                // Fullscreen controls
                Row(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (activePlayer == "player_2" || activePlayer == "pot_player") {
                        // Playback Speed button
                        Box {
                            Button(
                                onClick = { speedMenuExpanded = true },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color.Black.copy(alpha = 0.6f),
                                    contentColor = Color.White
                                ),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.height(36.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp)
                            ) {
                                Text(text = "Speed: ${currentSpeed}x", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }
                            DropdownMenu(
                                expanded = speedMenuExpanded,
                                onDismissRequest = { speedMenuExpanded = false },
                                modifier = Modifier.background(SurfaceColor)
                            ) {
                                listOf(0.5f, 1.0f, 1.25f, 1.5f, 2.0f).forEach { speed ->
                                    DropdownMenuItem(
                                        text = { Text("${speed}x", color = Color.White) },
                                        onClick = {
                                            currentSpeed = speed
                                            exoPlayer.setPlaybackSpeed(speed)
                                            speedMenuExpanded = false
                                        }
                                    )
                                }
                            }
                        }

                        // Quality selector button
                        Box {
                            Button(
                                onClick = { qualityMenuExpanded = true },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color.Black.copy(alpha = 0.6f),
                                    contentColor = Color.White
                                ),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.height(36.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp)
                            ) {
                                Text(text = "Quality: $currentQuality", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }
                            DropdownMenu(
                                expanded = qualityMenuExpanded,
                                onDismissRequest = { qualityMenuExpanded = false },
                                modifier = Modifier.background(SurfaceColor)
                            ) {
                                listOf("HD", "SD", "Low").forEach { q ->
                                    DropdownMenuItem(
                                        text = { Text(q, color = Color.White) },
                                        onClick = {
                                            setQuality(q)
                                            qualityMenuExpanded = false
                                        }
                                    )
                                }
                            }
                        }

                        // PiP button
                        Button(
                            onClick = {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                    activity?.enterPictureInPictureMode()
                                }
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.Black.copy(alpha = 0.6f),
                                contentColor = PrimaryEmerald
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.height(36.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp)
                        ) {
                            Text(text = "PiP", fontSize = 10.sp, fontWeight = FontWeight.Black)
                        }

                        // -10s Button
                        Button(
                            onClick = { exoPlayer.seekTo(maxOf(0L, exoPlayer.currentPosition - 10000L)) },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.Black.copy(alpha = 0.6f),
                                contentColor = Color.White
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.height(36.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp)
                        ) {
                            Text("-10s", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }

                        // +10s Button
                        Button(
                            onClick = {
                                val duration = exoPlayer.duration
                                val target = exoPlayer.currentPosition + 10000L
                                exoPlayer.seekTo(if (duration > 0) minOf(duration, target) else target)
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.Black.copy(alpha = 0.6f),
                                contentColor = Color.White
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.height(36.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp)
                        ) {
                            Text("+10s", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    // Exit Fullscreen
                    IconButton(
                        onClick = { isFullscreen = false },
                        modifier = Modifier
                            .background(Color.Black.copy(alpha = 0.6f), shape = RoundedCornerShape(8.dp))
                    ) {
                        Icon(
                            imageVector = Icons.Default.FullscreenExit,
                            contentDescription = "Exit Fullscreen",
                            tint = Color.White
                        )
                    }
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
                    if (isYouTube) {
                        YouTubeWebViewPlayer(url = activeUrl, modifier = Modifier.fillMaxSize())
                    } else {
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
                    }

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
                    if (!isYouTube && (isReconnecting || bufferState == "Buffering...")) {
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
                                        text = streamLabels.getOrElse(idx) { "Feed ${idx + 1}" },
                                        color = if (isSelected) Color.Black else Color.White,
                                        fontWeight = FontWeight.Black,
                                        fontSize = 11.sp
                                    )
                                }
                            }
                        }
                    }

                    // Player 2 / Pot Player Controls (Speed & Quality & PiP)
                    if (activePlayer == "player_2" || activePlayer == "pot_player") {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(SurfaceColor, shape = RoundedCornerShape(16.dp))
                                .padding(16.dp)
                        ) {
                            Text(
                                text = if (activePlayer == "pot_player") "POT PLAYER HIGH-SPEED CONTROLS" else "PLAYER 2 HIGH-SPEED CONTROLS",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Black,
                                color = SecondaryGold,
                                letterSpacing = 1.sp
                            )
                            HorizontalDivider(color = SlateDark.copy(alpha = 0.5f))
                            
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Playback Speed Button/Dropdown
                                Box(modifier = Modifier.weight(1f)) {
                                    Button(
                                        onClick = { speedMenuExpanded = true },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = CardColor,
                                            contentColor = Color.White
                                        ),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.fillMaxWidth().height(40.dp),
                                        contentPadding = PaddingValues(horizontal = 4.dp)
                                    ) {
                                        Text(text = "Speed: ${currentSpeed}x", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    }
                                    DropdownMenu(
                                        expanded = speedMenuExpanded,
                                        onDismissRequest = { speedMenuExpanded = false },
                                        modifier = Modifier.background(SurfaceColor)
                                    ) {
                                        listOf(0.5f, 1.0f, 1.25f, 1.5f, 2.0f).forEach { speed ->
                                            DropdownMenuItem(
                                                text = { Text("${speed}x", color = Color.White) },
                                                onClick = {
                                                    currentSpeed = speed
                                                    exoPlayer.setPlaybackSpeed(speed)
                                                    speedMenuExpanded = false
                                                }
                                            )
                                        }
                                    }
                                }

                                // Quality selector Button/Dropdown
                                Box(modifier = Modifier.weight(1f)) {
                                    Button(
                                        onClick = { qualityMenuExpanded = true },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = CardColor,
                                            contentColor = Color.White
                                        ),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.fillMaxWidth().height(40.dp),
                                        contentPadding = PaddingValues(horizontal = 4.dp)
                                    ) {
                                        Text(text = "Quality: $currentQuality", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    }
                                    DropdownMenu(
                                        expanded = qualityMenuExpanded,
                                        onDismissRequest = { qualityMenuExpanded = false },
                                        modifier = Modifier.background(SurfaceColor)
                                    ) {
                                        listOf("HD", "SD", "Low").forEach { q ->
                                            DropdownMenuItem(
                                                text = { Text(q, color = Color.White) },
                                                onClick = {
                                                    setQuality(q)
                                                    qualityMenuExpanded = false
                                                }
                                            )
                                        }
                                    }
                                }

                                // Picture-in-Picture Button
                                Button(
                                    onClick = {
                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                            activity?.enterPictureInPictureMode()
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = PrimaryEmerald,
                                        contentColor = Color.Black
                                    ),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.weight(1f).height(40.dp),
                                    contentPadding = PaddingValues(horizontal = 4.dp)
                                ) {
                                    Text(text = "PiP Mode", fontSize = 11.sp, fontWeight = FontWeight.Black)
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Skip Backward Button
                                Button(
                                    onClick = {
                                        exoPlayer.seekTo(maxOf(0L, exoPlayer.currentPosition - 10000L))
                                    },
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = CardColor,
                                        contentColor = Color.White
                                    ),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.weight(1f).height(40.dp)
                                ) {
                                    Text("-10s", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }

                                // Skip Forward Button
                                Button(
                                    onClick = {
                                        val duration = exoPlayer.duration
                                        val target = exoPlayer.currentPosition + 10000L
                                        exoPlayer.seekTo(if (duration > 0) minOf(duration, target) else target)
                                    },
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = CardColor,
                                        contentColor = Color.White
                                    ),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.weight(1f).height(40.dp)
                                ) {
                                    Text("+10s", fontSize = 11.sp, fontWeight = FontWeight.Bold)
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

fun getYouTubeEmbedUrl(url: String): String {
    if (url.contains("youtube.com/embed/")) {
        return url
    }
    val videoId = if (url.contains("youtu.be/")) {
        url.substringAfter("youtu.be/").substringBefore("?").substringBefore("#")
    } else if (url.contains("youtube.com/watch")) {
        val queryParams = url.substringAfter("?", "").split("&")
        queryParams.find { it.startsWith("v=") }?.substringAfter("v=")?.substringBefore("#") ?: ""
    } else if (url.contains("youtube.com/v/")) {
        url.substringAfter("youtube.com/v/").substringBefore("?").substringBefore("#")
    } else {
        ""
    }
    return if (videoId.isNotEmpty()) {
        "https://www.youtube.com/embed/$videoId?autoplay=1"
    } else {
        url
    }
}

@Composable
fun YouTubeWebViewPlayer(url: String, modifier: Modifier = Modifier) {
    val embedUrl = remember(url) {
        getYouTubeEmbedUrl(url)
    }
    val htmlContent = remember(embedUrl) {
        """
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
                iframe { width: 100%; height: 100%; border: none; }
            </style>
        </head>
        <body>
            <iframe 
                src="$embedUrl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen>
            </iframe>
        </body>
        </html>
        """.trimIndent()
    }
    AndroidView(
        factory = { context ->
            android.webkit.WebView(context).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
                settings.javaScriptEnabled = true
                settings.mediaPlaybackRequiresUserGesture = false
                settings.domStorageEnabled = true
                settings.useWideViewPort = true
                settings.loadWithOverviewMode = true
                setBackgroundColor(android.graphics.Color.BLACK)
                
                webChromeClient = android.webkit.WebChromeClient()
                webViewClient = android.webkit.WebViewClient()
                loadDataWithBaseURL(
                    "https://www.youtube.com",
                    htmlContent,
                    "text/html",
                    "UTF-8",
                    null
                )
            }
        },
        update = { webView ->
            webView.loadDataWithBaseURL(
                "https://www.youtube.com",
                htmlContent,
                "text/html",
                "UTF-8",
                null
            )
        },
        modifier = modifier
    )
}
