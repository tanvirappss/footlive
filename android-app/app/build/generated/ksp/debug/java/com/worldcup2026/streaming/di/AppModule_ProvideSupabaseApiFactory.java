package com.worldcup2026.streaming.di;

import com.worldcup2026.streaming.data.remote.SupabaseApi;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.Preconditions;
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
public final class AppModule_ProvideSupabaseApiFactory implements Factory<SupabaseApi> {
  private final Provider<OkHttpClient> okHttpClientProvider;

  public AppModule_ProvideSupabaseApiFactory(Provider<OkHttpClient> okHttpClientProvider) {
    this.okHttpClientProvider = okHttpClientProvider;
  }

  @Override
  public SupabaseApi get() {
    return provideSupabaseApi(okHttpClientProvider.get());
  }

  public static AppModule_ProvideSupabaseApiFactory create(
      Provider<OkHttpClient> okHttpClientProvider) {
    return new AppModule_ProvideSupabaseApiFactory(okHttpClientProvider);
  }

  public static SupabaseApi provideSupabaseApi(OkHttpClient okHttpClient) {
    return Preconditions.checkNotNullFromProvides(AppModule.INSTANCE.provideSupabaseApi(okHttpClient));
  }
}
