<template>
  <div>
    <Script onerror="console.error('error handler')" src="/invalid-file.js" />
    <Script>
      console.log('this is valid')
    </Script>
  </div>
</template>
