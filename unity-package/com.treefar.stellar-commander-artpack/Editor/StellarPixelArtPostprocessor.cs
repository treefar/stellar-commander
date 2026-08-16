using UnityEditor;
using UnityEngine;

namespace Treefar.StellarCommanderArt.Editor
{
    public sealed class StellarPixelArtPostprocessor : AssetPostprocessor
    {
        private const string PackagePath = "Packages/com.treefar.stellar-commander-artpack/Runtime/Resources/StellarCommanderArt/";

        private void OnPreprocessTexture()
        {
            if (!assetPath.StartsWith(PackagePath) || !assetPath.EndsWith(".png")) return;
            TextureImporter importer = (TextureImporter)assetImporter;
            importer.textureType = TextureImporterType.Default;
            importer.sRGBTexture = true;
            importer.alphaIsTransparency = true;
            importer.filterMode = FilterMode.Point;
            importer.textureCompression = TextureImporterCompression.Uncompressed;
            importer.crunchedCompression = false;
            importer.mipmapEnabled = false;
            importer.npotScale = TextureImporterNPOTScale.None;
            importer.wrapMode = TextureWrapMode.Clamp;
            importer.isReadable = false;
        }
    }
}
