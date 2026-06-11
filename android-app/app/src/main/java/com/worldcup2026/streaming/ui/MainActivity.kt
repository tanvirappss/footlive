package com.worldcup2026.streaming.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.worldcup2026.streaming.ui.screens.HomeScreen
import com.worldcup2026.streaming.ui.screens.MatchDetailsScreen
import com.worldcup2026.streaming.ui.screens.SplashScreen
import com.worldcup2026.streaming.ui.screens.StreamingScreen
import com.worldcup2026.streaming.ui.theme.BackgroundColor
import com.worldcup2026.streaming.ui.theme.WorldCupTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            WorldCupTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = BackgroundColor
                ) {
                    val navController = rememberNavController()

                    NavHost(
                        navController = navController,
                        startDestination = "splash"
                    ) {
                        // Splash Screen Route
                        composable("splash") {
                            SplashScreen(
                                onNavigateToHome = {
                                    navController.navigate("home") {
                                        popUpTo("splash") { inclusive = true }
                                    }
                                }
                            )
                        }

                        // Home Screen Route
                        composable("home") {
                            HomeScreen(
                                viewModel = viewModel,
                                onWatchMatch = { id, title ->
                                    navController.navigate("watch/$id/$title")
                                },
                                onViewDetails = { id ->
                                    navController.navigate("details/$id")
                                }
                            )
                        }

                        // Watching Stream Route
                        composable(
                            route = "watch/{matchId}/{matchTitle}",
                            arguments = listOf(
                                navArgument("matchId") { type = NavType.StringType },
                                navArgument("matchTitle") { type = NavType.StringType }
                            )
                        ) { backStackEntry ->
                            val matchId = backStackEntry.arguments?.getString("matchId") ?: ""
                            val matchTitle = backStackEntry.arguments?.getString("matchTitle") ?: ""
                            StreamingScreen(
                                matchId = matchId,
                                matchTitle = matchTitle,
                                viewModel = viewModel,
                                onBack = {
                                    navController.popBackStack()
                                }
                            )
                        }

                        // Match Details Route
                        composable(
                            route = "details/{matchId}",
                            arguments = listOf(
                                navArgument("matchId") { type = NavType.StringType }
                            )
                        ) { backStackEntry ->
                            val matchId = backStackEntry.arguments?.getString("matchId") ?: ""
                            MatchDetailsScreen(
                                matchId = matchId,
                                viewModel = viewModel,
                                onBack = {
                                    navController.popBackStack()
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}
