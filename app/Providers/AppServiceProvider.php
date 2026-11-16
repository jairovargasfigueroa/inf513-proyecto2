<?php

namespace App\Providers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // La base db_grupo14sa es compartida con el sistema vía correo: se bloquean
        // migrate:fresh, migrate:refresh, migrate:reset y db:wipe, que borrarían
        // también sus 26 tablas.
        DB::prohibitDestructiveCommands();
    }
}
