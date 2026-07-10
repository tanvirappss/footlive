package com.worldcup2026.streaming.data.remote;

import com.worldcup2026.streaming.domain.repository.AppRepository;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;
import okhttp3.OkHttpClient;

@ScopeMetadata("javax.inject.Singleton")
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
public final class RealtimeClient_Factory implements Factory<RealtimeClient> {
  private final Provider<AppRepository> repositoryProvider;

  private final Provider<OkHttpClient> okHttpClientProvider;

  public RealtimeClient_Factory(Provider<AppRepository> repositoryProvider,
      Provider<OkHttpClient> okHttpClientProvider) {
    this.repositoryProvider = repositoryProvider;
    this.okHttpClientProvider = okHttpClientProvider;
  }

  @Override
  public RealtimeClient get() {
    return newInstance(repositoryProvider.get(), okHttpClientProvider.get());
  }

  public static RealtimeClient_Factory create(Provider<AppRepository> repositoryProvider,
      Provider<OkHttpClient> okHttpClientProvider) {
    return new RealtimeClient_Factory(repositoryProvider, okHttpClientProvider);
  }

  public static RealtimeClient newInstance(AppRepository repository, OkHttpClient okHttpClient) {
    return new RealtimeClient(repository, okHttpClient);
  }
}
