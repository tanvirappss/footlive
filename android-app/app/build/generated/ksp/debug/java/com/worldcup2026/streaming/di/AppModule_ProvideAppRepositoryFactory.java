package com.worldcup2026.streaming.di;

import com.worldcup2026.streaming.data.local.AppDao;
import com.worldcup2026.streaming.data.remote.SupabaseApi;
import com.worldcup2026.streaming.domain.repository.AppRepository;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.Preconditions;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

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
public final class AppModule_ProvideAppRepositoryFactory implements Factory<AppRepository> {
  private final Provider<AppDao> daoProvider;

  private final Provider<SupabaseApi> apiProvider;

  public AppModule_ProvideAppRepositoryFactory(Provider<AppDao> daoProvider,
      Provider<SupabaseApi> apiProvider) {
    this.daoProvider = daoProvider;
    this.apiProvider = apiProvider;
  }

  @Override
  public AppRepository get() {
    return provideAppRepository(daoProvider.get(), apiProvider.get());
  }

  public static AppModule_ProvideAppRepositoryFactory create(Provider<AppDao> daoProvider,
      Provider<SupabaseApi> apiProvider) {
    return new AppModule_ProvideAppRepositoryFactory(daoProvider, apiProvider);
  }

  public static AppRepository provideAppRepository(AppDao dao, SupabaseApi api) {
    return Preconditions.checkNotNullFromProvides(AppModule.INSTANCE.provideAppRepository(dao, api));
  }
}
