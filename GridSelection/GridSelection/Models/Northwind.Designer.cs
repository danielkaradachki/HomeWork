﻿//------------------------------------------------------------------------------
// <auto-generated>
//    This code was generated from a template.
//
//    Manual changes to this file may cause unexpected behavior in your application.
//    Manual changes to this file will be overwritten if the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

using System;
using System.ComponentModel;
using System.Data.EntityClient;
using System.Data.Objects;
using System.Data.Objects.DataClasses;
using System.Linq;
using System.Runtime.Serialization;
using System.Xml.Serialization;

[assembly: EdmSchemaAttribute()]
#region EDM Relationship Metadata

[assembly: EdmRelationshipAttribute("Northwind", "FK_Products_Categories", "Category", System.Data.Metadata.Edm.RelationshipMultiplicity.ZeroOrOne, typeof(GridSelection.Models.Category), "Product", System.Data.Metadata.Edm.RelationshipMultiplicity.Many, typeof(GridSelection.Models.Product), true)]

#endregion

namespace GridSelection.Models
{
    #region Contexts
    
    /// <summary>
    /// No Metadata Documentation available.
    /// </summary>
    public partial class NorthwindContainer : ObjectContext
    {
        #region Constructors
    
        /// <summary>
        /// Initializes a new NorthwindContainer object using the connection string found in the 'NorthwindContainer' section of the application configuration file.
        /// </summary>
        public NorthwindContainer() : base("name=NorthwindContainer", "NorthwindContainer")
        {
            this.ContextOptions.LazyLoadingEnabled = true;
            OnContextCreated();
        }
    
        /// <summary>
        /// Initialize a new NorthwindContainer object.
        /// </summary>
        public NorthwindContainer(string connectionString) : base(connectionString, "NorthwindContainer")
        {
            this.ContextOptions.LazyLoadingEnabled = true;
            OnContextCreated();
        }
    
        /// <summary>
        /// Initialize a new NorthwindContainer object.
        /// </summary>
        public NorthwindContainer(EntityConnection connection) : base(connection, "NorthwindContainer")
        {
            this.ContextOptions.LazyLoadingEnabled = true;
            OnContextCreated();
        }
    
        #endregion
    
        #region Partial Methods
    
        partial void OnContextCreated();
    
        #endregion
    
        #region ObjectSet Properties
    
        /// <summary>
        /// No Metadata Documentation available.
        /// </summary>
        public ObjectSet<Category> Categories
        {
            get
            {
                if ((_Categories == null))
                {
                    _Categories = base.CreateObjectSet<Category>("Categories");
                }
                return _Categories;
            }
        }
        private ObjectSet<Category> _Categories;
    
        /// <summary>
        /// No Metadata Documentation available.
        /// </summary>
        public ObjectSet<Product> Products
        {
            get
            {
                if ((_Products == null))
                {
                    _Products = base.CreateObjectSet<Product>("Products");
                }
                return _Products;
            }
        }
        private ObjectSet<Product> _Products;

        #endregion

        #region AddTo Methods
    
        /// <summary>
        /// Deprecated Method for adding a new object to the Categories EntitySet. Consider using the .Add method of the associated ObjectSet&lt;T&gt; property instead.
        /// </summary>
        public void AddToCategories(Category category)
        {
            base.AddObject("Categories", category);
        }
    
        /// <summary>
        /// Deprecated Method for adding a new object to the Products EntitySet. Consider using the .Add method of the associated ObjectSet&lt;T&gt; property instead.
        /// </summary>
        public void AddToProducts(Product product)
        {
            base.AddObject("Products", product);
        }

        #endregion

    }

    #endregion

    #region Entities
    
    /// <summary>
    /// No Metadata Documentation available.
    /// </summary>
    [EdmEntityTypeAttribute(NamespaceName="Northwind", Name="Category")]
    [Serializable()]
    [DataContractAttribute(IsReference=true)]
    public partial class Category : EntityObject
    {
        #region Factory Method
    
        /// <summary>
        /// Create a new Category object.
        /// </summary>
        /// <param name="categoryID">Initial value of the CategoryID property.</param>
        /// <param name="categoryName">Initial value of the CategoryName property.</param>
        public static Category CreateCategory(global::System.Int32 categoryID, global::System.String categoryName)
        {
            Category category = new Category();
            category.CategoryID = categoryID;
            category.CategoryName = categoryName;
            return category;
        }

        #endregion

        #region Primitive Properties
    
        /// <summary>
        /// No Metadata Documentation available.
        /// </summary>
        [EdmScalarPropertyAttribute(EntityKeyProperty=true, IsNullable=false)]
        [DataMemberAttribute()]
        public global::System.Int32 CategoryID
        {
            get
            {
                return _CategoryID;
            }
            set
            {
                if (_CategoryID != value)
                {
                    OnCategoryIDChanging(value);
                    ReportPropertyChanging("CategoryID");
                    _CategoryID = StructuralObject.SetValidValue(value);
                    ReportPropertyChanged("CategoryID");
                    OnCategoryIDChanged();
                }
            }
        }
        private global::System.Int32 _CategoryID;
        partial void OnCategoryIDChanging(global::System.Int32 value);
        partial void OnCategoryIDChanged();
    
        /// <summary>
        /// No Metadata Documentation available.
        /// </summary>
        [EdmScalarPropertyAttribute(EntityKeyProperty=false, IsNullable=false)]
        [DataMemberAttribute()]
        public global::System.String CategoryName
        {
            get
            {
                return _CategoryName;
            }
            set
            {
                OnCategoryNameChanging(value);
                ReportPropertyChanging("CategoryName");
                _CategoryName = StructuralObject.SetValidValue(value, false);
                ReportPropertyChanged("CategoryName");
                OnCategoryNameChanged();
            }
        }
        private global::System.String _CategoryName;
        partial void OnCategoryNameChanging(global::System.String value);
        partial void OnCategoryNameChanged();
    
        /// <summary>
        /// No Metadata Documentation available.
        /// </summary>
        [EdmScalarPropertyAttribute(EntityKeyProperty=false, IsNullable=true)]
        [DataMemberAttribute()]
        public global::System.String Description
        {
            get
            {
                return _Description;
            }
            set
            {
                OnDescriptionChanging(value);
                ReportPropertyChanging("Description");
                _Description = StructuralObject.SetValidValue(value, true);
                ReportPropertyChanged("Description");
                OnDescriptionChanged();
            }
        }
        private global::System.String _Description;
        partial void OnDescriptionChanging(global::System.String value);
        partial void OnDescriptionChanged();
    
        /// <summary>
        /// No Metadata Documentation available.
        /// </summary>
        [EdmScalarPropertyAttribute(EntityKeyProperty=false, IsNullable=true)]
        [DataMemberAttribute()]
        public global::System.Byte[] Picture
        {
            get
            {
                return StructuralObject.GetValidValue(_Picture);
            }
            set
            {
                OnPictureChanging(value);
                ReportPropertyChanging("Picture");
                _Picture = StructuralObject.SetValidValue(value, true);
                ReportPropertyChanged("Picture");
                OnPictureChanged();
            }
        }
        private global::System.Byte[] _Picture;
        partial void OnPictureChanging(global::System.Byte[] value);
        partial void OnPictureChanged();

        #endregion

    
        #region Navigation Properties
    
        /// <summary>
        /// No Metadata Documentation available.
        /// </summary>
        [XmlIgnoreAttribute()]
        [SoapIgnoreAttribute()]
        [DataMemberAttribute()]
        [EdmRelationshipNavigationPropertyAttribute("Northwind", "FK_Products_Categories", "Product")]
        public EntityCollection<Product> Products
        {
            get
            {
                return ((IEntityWithRelationships)this).RelationshipManager.GetRelatedCollection<Product>("Northwind.FK_Products_Categories", "Product");
            }
            set
            {
                if ((value != null))
                {
                    ((IEntityWithRelationships)this).RelationshipManager.InitializeRelatedCollection<Product>("Northwind.FK_Products_Categories", "Product", value);
                }
            }
        }

        #endregion

    }
    
    /// <summary>
    /// No Metadata Documentation available.
    /// </summary>
    [EdmEntityTypeAttribute(NamespaceName="Northwind", Name="Product")]
    [Serializable()]
    [DataContractAttribute(IsReference=true)]
    public partial class Product : EntityObject
    {
        #region Factory Method
    
        /// <summary>
        /// Create a new Product object.
        /// </summary>
        /// <param name="productID">Initial value of the ProductID property.</param>
        /// <param name="productName">Initial value of the ProductName property.</param>
        /// <param name="discontinued">Initial value of the Discontinued property.</param>
        public static Product CreateProduct(global::System.Int32 productID, global::System.String productName, global::System.Boolean discontinued)
        {
            Product product = new Product();
            product.ProductID = productID;
            product.ProductName = productName;
            product.Discontinued = discontinued;
            return product;
        }

        #endregion

        #region Primitive Properties
    
        /// <summary>
        /// No Metadata Documentation available.
        /// </summary>
        [EdmScalarPropertyAttribute(EntityKeyProperty=true, IsNullable=false)]
        [DataMemberAttribute()]
        public global::System.Int32 ProductID
        {
            get
            {
                return _ProductID;
            }
            set
            {
                if (_ProductID != value)
                {
                    OnProductIDChanging(value);
                    ReportPropertyChanging("ProductID");
                    _ProductID = StructuralObject.SetValidValue(value);
                    ReportPropertyChanged("ProductID");
                    OnProductIDChanged();
                }
            }
        }
        private global::System.Int32 _ProductID;
        partial void OnProductIDChanging(global::System.Int32 value);
        partial void OnProductIDChanged();
    
        /// <summary>
        /// No Metadata Documentation available.
        /// </summary>
        [EdmScalarPropertyAttribute(EntityKeyProperty=false, IsNullable=false)]
        [DataMemberAttribute()]
        public global::System.String ProductName
        {
            get
            {
                return _ProductName;
            }
            set
            {
                OnProductNameChanging(value);
                ReportPropertyChanging("ProductName");
                _ProductName = StructuralObject.SetValidValue(value, false);
                ReportPropertyChanged("ProductName");
                OnProductNameChanged();
            }
        }
        private global::System.String _ProductName;
        partial void OnProductNameChanging(global::System.String value);
        partial void OnProductNameChanged();
    
        /// <summary>
        /// No Metadata Documentation available.
        /// </summary>
        [EdmScalarPropertyAttribute(EntityKeyProperty=false, IsNullable=true)]
        [DataMemberAttribute()]
        public Nullable<global::System.Int32> SupplierID
        {
            get
            {
                return _SupplierID;
            }
            set
            {
                OnSupplierIDChanging(value);
                ReportPropertyChanging("SupplierID");
                _SupplierID = StructuralObject.SetValidValue(value);
                ReportPropertyChanged("SupplierID");
                OnSupplierIDChanged();
            }
        }
        private Nullable<global::System.Int32> _SupplierID;
        partial void OnSupplierIDChanging(Nullable<global::System.Int32> value);
        partial void OnSupplierIDChanged();
    
        /// <summary>
        /// No Metadata Documentation available.
        /// </summary>
        [EdmScalarPropertyAttribute(EntityKeyProperty=false, IsNullable=true)]
        [DataMemberAttribute()]
        public Nullable<global::System.Int32> CategoryID
        {
            get
            {
                return _CategoryID;
            }
            set
            {
                OnCategoryIDChanging(value);
                ReportPropertyChanging("CategoryID");
                _CategoryID = StructuralObject.SetValidValue(value);
                ReportPropertyChanged("CategoryID");
                OnCategoryIDChanged();
            }
        }
        private Nullable<global::System.Int32> _CategoryID;
        partial void OnCategoryIDChanging(Nullable<global::System.Int32> value);
        partial void OnCategoryIDChanged();
    
        /// <summary>
        /// No Metadata Documentation available.
        /// </summary>
        [EdmScalarPropertyAttribute(EntityKeyProperty=false, IsNullable=true)]
        [DataMemberAttribute()]
        public global::System.String QuantityPerUnit
        {
            get
            {
                return _QuantityPerUnit;
            }
            set
            {
                OnQuantityPerUnitChanging(value);
                ReportPropertyChanging("QuantityPerUnit");
                _QuantityPerUnit = StructuralObject.SetValidValue(value, true);
                ReportPropertyChanged("QuantityPerUnit");
                OnQuantityPerUnitChanged();
            }
        }
        private global::System.String _QuantityPerUnit;
        partial void OnQuantityPerUnitChanging(global::System.String value);
        partial void OnQuantityPerUnitChanged();
    
        /// <summary>
        /// No Metadata Documentation available.
        /// </summary>
        [EdmScalarPropertyAttribute(EntityKeyProperty=false, IsNullable=true)]
        [DataMemberAttribute()]
        public Nullable<global::System.Decimal> UnitPrice
        {
            get
            {
                return _UnitPrice;
            }
            set
            {
                OnUnitPriceChanging(value);
                ReportPropertyChanging("UnitPrice");
                _UnitPrice = StructuralObject.SetValidValue(value);
                ReportPropertyChanged("UnitPrice");
                OnUnitPriceChanged();
            }
        }
        private Nullable<global::System.Decimal> _UnitPrice;
        partial void OnUnitPriceChanging(Nullable<global::System.Decimal> value);
        partial void OnUnitPriceChanged();
    
        /// <summary>
        /// No Metadata Documentation available.
        /// </summary>
        [EdmScalarPropertyAttribute(EntityKeyProperty=false, IsNullable=true)]
        [DataMemberAttribute()]
        public Nullable<global::System.Int16> UnitsInStock
        {
            get
            {
                return _UnitsInStock;
            }
            set
            {
                OnUnitsInStockChanging(value);
                ReportPropertyChanging("UnitsInStock");
                _UnitsInStock = StructuralObject.SetValidValue(value);
                ReportPropertyChanged("UnitsInStock");
                OnUnitsInStockChanged();
            }
        }
        private Nullable<global::System.Int16> _UnitsInStock;
        partial void OnUnitsInStockChanging(Nullable<global::System.Int16> value);
        partial void OnUnitsInStockChanged();
    
        /// <summary>
        /// No Metadata Documentation available.
        /// </summary>
        [EdmScalarPropertyAttribute(EntityKeyProperty=false, IsNullable=true)]
        [DataMemberAttribute()]
        public Nullable<global::System.Int16> UnitsOnOrder
        {
            get
            {
                return _UnitsOnOrder;
            }
            set
            {
                OnUnitsOnOrderChanging(value);
                ReportPropertyChanging("UnitsOnOrder");
                _UnitsOnOrder = StructuralObject.SetValidValue(value);
                ReportPropertyChanged("UnitsOnOrder");
                OnUnitsOnOrderChanged();
            }
        }
        private Nullable<global::System.Int16> _UnitsOnOrder;
        partial void OnUnitsOnOrderChanging(Nullable<global::System.Int16> value);
        partial void OnUnitsOnOrderChanged();
    
        /// <summary>
        /// No Metadata Documentation available.
        /// </summary>
        [EdmScalarPropertyAttribute(EntityKeyProperty=false, IsNullable=true)]
        [DataMemberAttribute()]
        public Nullable<global::System.Int16> ReorderLevel
        {
            get
            {
                return _ReorderLevel;
            }
            set
            {
                OnReorderLevelChanging(value);
                ReportPropertyChanging("ReorderLevel");
                _ReorderLevel = StructuralObject.SetValidValue(value);
                ReportPropertyChanged("ReorderLevel");
                OnReorderLevelChanged();
            }
        }
        private Nullable<global::System.Int16> _ReorderLevel;
        partial void OnReorderLevelChanging(Nullable<global::System.Int16> value);
        partial void OnReorderLevelChanged();
    
        /// <summary>
        /// No Metadata Documentation available.
        /// </summary>
        [EdmScalarPropertyAttribute(EntityKeyProperty=false, IsNullable=false)]
        [DataMemberAttribute()]
        public global::System.Boolean Discontinued
        {
            get
            {
                return _Discontinued;
            }
            set
            {
                OnDiscontinuedChanging(value);
                ReportPropertyChanging("Discontinued");
                _Discontinued = StructuralObject.SetValidValue(value);
                ReportPropertyChanged("Discontinued");
                OnDiscontinuedChanged();
            }
        }
        private global::System.Boolean _Discontinued;
        partial void OnDiscontinuedChanging(global::System.Boolean value);
        partial void OnDiscontinuedChanged();

        #endregion

    
        #region Navigation Properties
    
        /// <summary>
        /// No Metadata Documentation available.
        /// </summary>
        [XmlIgnoreAttribute()]
        [SoapIgnoreAttribute()]
        [DataMemberAttribute()]
        [EdmRelationshipNavigationPropertyAttribute("Northwind", "FK_Products_Categories", "Category")]
        public Category Category
        {
            get
            {
                return ((IEntityWithRelationships)this).RelationshipManager.GetRelatedReference<Category>("Northwind.FK_Products_Categories", "Category").Value;
            }
            set
            {
                ((IEntityWithRelationships)this).RelationshipManager.GetRelatedReference<Category>("Northwind.FK_Products_Categories", "Category").Value = value;
            }
        }
        /// <summary>
        /// No Metadata Documentation available.
        /// </summary>
        [BrowsableAttribute(false)]
        [DataMemberAttribute()]
        public EntityReference<Category> CategoryReference
        {
            get
            {
                return ((IEntityWithRelationships)this).RelationshipManager.GetRelatedReference<Category>("Northwind.FK_Products_Categories", "Category");
            }
            set
            {
                if ((value != null))
                {
                    ((IEntityWithRelationships)this).RelationshipManager.InitializeRelatedReference<Category>("Northwind.FK_Products_Categories", "Category", value);
                }
            }
        }

        #endregion

    }

    #endregion

    
}
