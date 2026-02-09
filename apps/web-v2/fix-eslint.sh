#!/bin/bash

# Script to auto-fix common ESLint warnings

cd "$(dirname "$0")"

# Fix unused err variables in catch blocks
find src/app/pages -name "*.tsx" -type f -exec sed -i '' 's/} catch (err) {/} catch (_err) {/g' {} \;
find src/app/pages -name "*.tsx" -type f -exec sed -i '' 's/} catch (error) {/} catch (_error) {/g' {} \;
find src/app/pages -name "*.tsx" -type f -exec sed -i '' 's/} catch (e) {/} catch (_e) {/g' {} \;

# Fix unused catch parameters with (err =>
find src/app/pages -name "*.tsx" -type f -exec sed -i '' 's/\\.catch((err) =>/\.catch((_err) =>/g' {} \;
find src/app/pages -name "*.tsx" -type f -exec sed -i '' 's/\\.catch((error) =>/\.catch((_error) =>/g' {} \;
find src/app/pages -name "*.tsx" -type f -exec sed -i '' 's/\\.catch((e) =>/\.catch((_e) =>/g' {} \;

echo "Fixed common ESLint warnings in pages/"
