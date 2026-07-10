package com.worldcup2026.streaming.ui;

import com.worldcup2026.streaming.data.remote.RealtimeClient;
import com.worldcup2026.streaming.domain.repository.AppRepository;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

@ScopeMetadata
@QualifierMetadata
@DaggerGenerated
@Generated(
    value = "dagger.internal.codegen.ComponentProcessor",
    comments = "https://dagger.dev"
)
@SuppressWarnings({
    "unchecked",
    "rawtypes",
    "KotlinInternal",
    "KotlinInternalInJava"
})
public final class MainViewModel_Factory implements Factory<MainViewModel> {
  private final Provider<AppRepository> repositoryProvider;

  private final Provider<RealtimeClient> realtimeClientProvider;

  public MainViewModel_Factory(Provider<AppRepository> repositoryProvider,
      Provider<RealtimeClient> realtimeClientProvider) {
    this.repositoryProvider = repositoryProvider;
    this.realtimeClientProvider = realtimeClientProvider;
  }

  @Override
  public MainViewModel get() {
    return newInstance(repositoryProvider.get(), realtimeClientProvider.get());
  }

  public static MainViewModel_Factory create(Provider<AppRepository> repositoryProvider,
      Provider<RealtimeClient> realtimeClientProvider) {
    return new MainViewModel_Factory(repositoryProvider, realtimeClientProvider);
  }

  public static MainViewModel newInstance(AppRepository repository, RealtimeClient realtimeClient) {
    return new MainViewModel(repository, realtimeClient);
  }
}
