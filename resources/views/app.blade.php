<!DOCTYPE html>
<html lang="es" data-tema="adultos" data-modo="dia">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="base-path" content="{{ rtrim(env('VITE_BASE_PATH', ''), '/') }}">
    <title>{{ config('app.name') }}</title>
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/main.jsx'])
</head>
<body class="antialiased">
    <div id="app"></div>
</body>
</html>
