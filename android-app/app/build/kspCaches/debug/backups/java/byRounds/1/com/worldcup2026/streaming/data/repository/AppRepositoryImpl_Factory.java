package com.worldcup2026.streaming.data.repository;

import com.worldcup2026.streaming.data.local.AppDao;
import com.worldcup2026.streaming.data.remote.SupabaseApi;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
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
public final class AppRepositoryImpl_Factory implements Factory<AppRepositoryImpl> {
  private final Provider<AppDao> daoProvider;

  private final Provider<SupabaseApi> apiProvider;

  public AppRepositoryImpl_Factory(Provider<AppDao> daoProvider,
      Provider<SupabaseApi> apiProvider) {
    this.daoProvider = daoProvider;
    this.apiProvider = apiProvider;
  }

  @Override
  public AppRepositoryImpl get() {
    return newInstance(daoProvider.get(), apiProvider.get());
  }

  public static AppRepositoryImpl_Factory create(Provider<AppDao> daoProvider,
      Provider<SupabaseApi> apiProvider) {
    return new AppRepositoryImpl_Factory(daoProvider, apiProvider);
  }

  public static AppRepositoryImpl newInstance(AppDao dao, SupabaseApi api) {
    return new AppRepositoryImpl(dao, api);
  }
}
